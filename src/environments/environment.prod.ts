/** Production — served behind the oauth2-proxy edge; all same-origin. */
export const environment = {
  production: true,
  apiBaseUrl: '/api',
  oauth2BaseUrl: '/oauth2',
  otel: {
    // Same-origin → no CORS; behind oauth2-proxy → only authenticated sessions can post.
    enabled: true,
    collectorUrl: '/otlp/v1/traces',
    serviceName: 'postyfox-frontend',
  },
};
