/**
 * Base (local development) environment.
 *
 * The SPA is served *behind* the oauth2-proxy edge, so every request is same-origin:
 *  - `/api/*`     is path-routed by the gateway to core-api / post-api, with the proxy
 *                 attaching the validated `Authorization: Bearer` token. The browser holds no tokens.
 *  - `/oauth2/*`  are oauth2-proxy's own endpoints (userinfo, sign_in, sign_out).
 *
 * In `ng serve`, proxy.conf.json forwards these prefixes to a running edge (default :4180).
 */
export const environment = {
  production: false,
  /** Prefix for all PostyFox core-api / post-api calls (path-routed by the gateway). */
  apiBaseUrl: '/api',
  /** oauth2-proxy endpoint prefix. */
  oauth2BaseUrl: '/oauth2',
  /**
   * Browser OpenTelemetry tracing. Off in `ng serve` by default — there's no collector edge
   * locally. To exercise it locally, run the edge stack and flip `enabled` to true (proxy.conf.json
   * already forwards `/otlp/` to the edge). See src/app/core/telemetry/browser-telemetry.ts.
   */
  otel: {
    enabled: false,
    collectorUrl: '/otlp/v1/traces',
    serviceName: 'postyfox-frontend',
  },
};
