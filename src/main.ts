import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { initBrowserTelemetry } from './app/core/telemetry/browser-telemetry';
import { environment } from './environments/environment';

// Before bootstrap: patch XHR/fetch so every request (incl. Angular HttpClient) is traced and
// carries the traceparent header into the API. No-op unless environment.otel.enabled.
initBrowserTelemetry(environment.otel);

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
