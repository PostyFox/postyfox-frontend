# Architecture Decision Records: frontend

Short records of the significant choices behind the PostyFox SPA. Each notes the context, the
decision, and the trade-off. Platform-wide decisions (auth edge, deployment shape, telemetry backend)
are in postyfox-core's [`docs/DECISIONS.md`](../../postyfox-core/docs/DECISIONS.md); this file
references them as core ADR-nnn.

---

## FE-ADR-001: The browser holds no tokens

**Context.** The platform authenticates through an oauth2-proxy edge in front of Keycloak (core
ADR-004). An SPA that runs its own OIDC client would need to store and refresh tokens in the
browser.

**Decision.** The SPA is served through the edge, so the user already has a session when it loads.
Every call is same-origin (`/api/*`, `/oauth2/*`); oauth2-proxy attaches the bearer token upstream.
The app reads `/oauth2/userinfo` for identity, and a 401 sends the browser through `/oauth2/sign_in`.
There is no issuer, client id or PKCE configuration in the frontend.

**Trade-off.** The SPA cannot run against the APIs without the edge, so local development needs the
core stack (or at least Keycloak, oauth2-proxy and the gateway). In exchange there is nothing in the
browser to steal, no CORS, and auth configuration lives in one place.

---

## FE-ADR-002: One prebuilt image for every deployment

**Context.** Angular bakes `environment.*.ts` into the bundle at build time. Building per environment
means the image tested on dev is not the image that runs in production.

**Decision.** Build produces one production image per commit. Everything environment-specific is
either same-origin (APIs, auth, telemetry under `/otlp`) or injected at container start:
`docker-entrypoint.sh` writes `OPERATOR_NAME` and `OPERATOR_CONTACT` into a static JSON asset that
`DeploymentConfigService` fetches on load (used by the privacy policy).

**Trade-off.** Runtime config is limited to what the entrypoint writes and costs one extra request
on load. The commit validated on dev is byte-for-byte what reaches production.

---

## FE-ADR-003: Served behind core's gateway, deployed independently

**Context.** The SPA and the APIs share one public origin (FE-ADR-001) but live in separate repos
with separate release cycles.

**Decision.** Core's nginx gateway is composed from `conf.d` fragments. In dev this repo contributes
only an upstream and a `90-root.conf` that overrides core's catch-all, so `/` goes to the SPA while
core's explicit API routes still win by longest prefix. In production the frontend is its own Helm
release in the `postyfox` namespace and core's chart proxies `/` to its Service when
`gateway.frontend.enabled` is set, falling back to the maintenance page if it is absent (core
ADR-013).

**Trade-off.** Routing ownership is split across repos, and the dev mechanism (file fragments)
differs from production (Helm values). Neither repo has to redeploy the other.

---

## FE-ADR-004: Zoneless Angular with standalone components and signals

**Context.** Zone.js patches browser APIs to trigger change detection, adding bundle size and
making change detection harder to reason about.

**Decision.** The app uses `provideZonelessChangeDetection()`, standalone components and signals for
state. Browser telemetry therefore uses OpenTelemetry's `StackContextManager` rather than
`ZoneContextManager`.

**Trade-off.** State changes must go through signals (or explicit change detection) to render, and
some third-party libraries that assume Zone.js cannot be used. Rendering is predictable and the
bundle is smaller.

---

## FE-ADR-005: Runtime translations with Transloco and Crowdin, UK English source

**Context.** The UI needs to be translatable without a build per language (issue #32).

**Decision.** UI text lives in `public/i18n/<lang>.json`, loaded at runtime by Transloco, with en-GB
as the source language. Translations sync from Crowdin. `npm run lint` fails on keys that are used
but not defined, or defined but unused, and on US spellings in the source.

**Trade-off.** Translations load over the network and template keys are not type-checked; the lint
scripts make up for the latter. Adding a language needs no rebuild of the translation pipeline,
only a `LANGUAGES` and `LOCALE_DATA` entry.

---

## FE-ADR-006: Browser traces through the same-origin edge

**Context.** Backend traces stop at the API, so a slow or failed click cannot be followed from the
browser to the platform.

**Decision.** The SPA emits OpenTelemetry traces for XHR and fetch, injecting W3C `traceparent` so the
browser span parents the API span. Spans post to `/otlp/v1/traces` on the SPA's own origin, through
oauth2-proxy and the gateway, to the environment's collector (core ADR-018). The gateway route accepts
only that path, capped at 4 MB. Sampling is deferred until real traffic volume is known.

**Trade-off.** About 26 kB of bundle and unsampled traffic for now. No CORS, only signed-in sessions
can send telemetry, and one `traceId` covers the whole click-to-platform journey.

---

## FE-ADR-007: Bootstrap 5 with a Materio-inspired theme

**Context.** The app needs a consistent admin-style UI without a heavy component framework.

**Decision.** Bootstrap 5 with Materio-inspired variable overrides and layout styles in
`src/styles/`, and a small set of shared Angular components (page header, empty state, status badge,
dialogs) for the rest.

**Trade-off.** Complex widgets are built by hand rather than taken from a component library, in
exchange for a small dependency surface and full control over markup.

---

## FE-ADR-008: Vitest unit tests through the Angular builder

**Context.** Karma needs a real browser and is no longer Angular's default test runner.

**Decision.** `ng test` runs the `@angular/build:unit-test` builder with the Vitest runner in jsdom.

**Trade-off.** jsdom is not a real browser, so layout and some browser APIs are not exercised. Tests
are fast and need no browser in CI.
