import { context, propagation, trace } from '@opentelemetry/api';
import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchSpanProcessor, StackContextManager, TracerProvider } from '@opentelemetry/sdk-trace';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

export interface OtelConfig {
  enabled: boolean;
  /** OTLP/HTTP traces endpoint. Same-origin (e.g. `/otlp/v1/traces`) so there's no CORS. */
  collectorUrl: string;
  serviceName: string;
}

let started = false;

/**
 * Initialise browser OpenTelemetry tracing.
 *
 * MUST run before Angular bootstraps, so the XHR/fetch instrumentations patch the browser globals
 * before the app issues any request. It emits spans for document load, resource timing, and every
 * HttpClient (XHR) / `fetch` call, and injects the W3C `traceparent` header on same-origin `/api`
 * requests, so a browser span becomes the parent of the API server span and the whole
 * click → API → queue → worker chain is a single distributed trace.
 *
 * Transport: OTLP/HTTP to {@link OtelConfig.collectorUrl}, which the gateway proxies to the OTel
 * collector. Because it's same-origin there is no CORS, and because it sits behind oauth2-proxy only
 * authenticated sessions can post. `deployment.environment` / `deployment.cluster` are NOT set here:
 * the collector stamps them server-side (single source of truth).
 */
export function initBrowserTelemetry(cfg: OtelConfig): void {
  if (!cfg.enabled || started) return;
  started = true;

  const provider = new TracerProvider({
    resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: cfg.serviceName }),
    spanProcessors: [
      new BatchSpanProcessor({ exporter: new OTLPTraceExporter({ url: cfg.collectorUrl }) }),
    ],
  });

  // The app is zoneless, so the stack context manager applies. Only XHR/fetch are
  // auto-instrumented and each request span is a root span, so no async context is needed.
  // sdk-trace 3.x dropped WebTracerProvider.register(); this is what it used to do.
  trace.setGlobalTracerProvider(provider);
  context.setGlobalContextManager(new StackContextManager().enable());
  propagation.setGlobalPropagator(
    new CompositePropagator({
      propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()],
    }),
  );

  // Don't trace the telemetry export itself (POSTs to /otlp, would recurse into more spans).
  // Same-origin /api requests get the traceparent header automatically, so no
  // propagateTraceHeaderCorsUrls is needed while the API stays same-origin.
  const ignoreUrls = [/\/otlp\//];

  registerInstrumentations({
    instrumentations: [
      new XMLHttpRequestInstrumentation({ ignoreUrls }), // Angular HttpClient uses XHR
      new FetchInstrumentation({ ignoreUrls }), // any raw fetch()
    ],
  });
}
