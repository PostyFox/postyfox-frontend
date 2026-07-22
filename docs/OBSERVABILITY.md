# Browser Observability (OpenTelemetry)

The SPA emits OpenTelemetry **traces** so the frontend is part of the same end-to-end distributed
trace as the backend. A browser span (document load / user-triggered `HttpClient` call) becomes the
**parent** of the API server span, which in turn parents the RabbitMQ → worker → connectors-node
spans. One `traceId` covers the whole `click → API → queue → worker → platform` journey.

## What's instrumented

- **Document load + resource timing** — initial page load performance.
- **`XMLHttpRequest`** — Angular `HttpClient` uses XHR (we don't enable `withFetch()`), so this is
  what captures every `/api` call.
- **`fetch`** — any raw `fetch()` (belt-and-braces; most app traffic is XHR).

Each outbound request to the same-origin `/api` gets a W3C `traceparent` header injected, which
ASP.NET Core extracts to continue the trace. No custom correlation id — `traceId` is the correlation
id. (Backend also stamps a searchable `PostId` on logs; see the core repo's observability notes.)

## How it's wired

| File | Role |
|------|------|
| `src/app/core/telemetry/browser-telemetry.ts` | `initBrowserTelemetry(cfg)` — sets up `WebTracerProvider` + `ZoneContextManager`, OTLP/HTTP exporter, and the XHR/fetch instrumentations. |
| `src/main.ts` | Calls `initBrowserTelemetry(environment.otel)` **before** `bootstrapApplication` (instrumentations must patch the globals before the app runs). |
| `src/environments/environment*.ts` | The `otel` config block (`enabled`, `collectorUrl`, `serviceName`). |
| `proxy.conf.json` | Forwards `/otlp/` to the edge for local dev. |

`deployment.environment` / `deployment.cluster` are **not** set in the browser — the collector stamps
them server-side (single source of truth), so browser spans carry the same env tags as everything
else.

## Transport (why there's no CORS)

```
browser --OTLP/HTTP POST /otlp/v1/traces--> oauth2-proxy --> gateway --> otel-collector:4318
                                                                             (traces pipeline → Data Prepper → OpenSearch)
```

- **Same-origin** (`/otlp` lives under the SPA's own host) ⇒ no CORS, no preflight.
- **Behind oauth2-proxy** ⇒ only authenticated sessions can post telemetry (bounded abuse surface).
- The gateway route is locked to the exact `/v1/traces` path so it can't be used to inject
  arbitrary metrics/logs. It lives in the **core** repo: `deploy/gateway/conf.d/routes/20-otlp.conf`.

## Enabling / disabling

Controlled by `environment.otel.enabled`:

- **Deployed dev & prod** — enabled (`environment.dev.ts`, `environment.prod.ts`).
- **`ng serve` (local)** — disabled by default (no collector edge locally). To try it locally, run
  the edge stack and flip `enabled` to `true`; `proxy.conf.json` already forwards `/otlp/`.

## Operational notes

- **No sampling / rate limiting yet** — deferred until real browser-traffic volume is known. When
  needed, add browser head sampling (a `TraceIdRatioBasedSampler` in `browser-telemetry.ts`) and/or a
  `limit_req` on the gateway `/otlp` route.
- **Body size** — the gateway caps the `/otlp` route at 4 MB (global limit is 10 MB).
- **PII** — fetch/XHR spans capture full request URLs (including query strings). If sensitive data
  ever appears in URLs, add a `SpanProcessor` to scrub it before export.
- **Bundle size** — the browser OTel packages add ~26 kB; the Angular initial-bundle warning budget
  was raised to 1 MB to accommodate this.
