# Development guide

How to run, build and test the PostyFox frontend. For deployment and how auth works see
[DEPLOYMENT.md](./DEPLOYMENT.md); for the reasoning behind the main choices see
[DECISIONS.md](./DECISIONS.md).

## Stack

- Angular 22: standalone components, signals, zoneless change detection
- Bootstrap 5 with a Materio-inspired theme (`src/styles/`)
- Auth: cookie session via the oauth2-proxy edge → Keycloak; the browser holds no tokens
- APIs: core-api and post-api, same-origin under `/api/*`
- Browser OpenTelemetry traces ([OBSERVABILITY.md](./OBSERVABILITY.md))

## Prerequisites

- Node.js 24.15+ (or 22.22.3+) and npm; CI and the Docker build use Node 24
- The postyfox-core stack running locally, for the APIs and login

## Run with hot reload

```bash
npm install
npm start          # ng serve → http://127.0.0.1:4200
```

`proxy.conf.json` forwards `/api`, `/oauth2` and `/otlp` to the core edge at
`http://localhost:4180`. Sign in once at http://localhost:4180; the session cookie then also works
from port 4200 (see [DEPLOYMENT.md](./DEPLOYMENT.md#local-ui-development-ng-serve)).

## Run the whole stack (SPA + APIs + auth)

```bash
cd ../postyfox-core/deploy
docker compose \
  -f docker-compose.yml \
  -f ../../postyfox-frontend/deploy/docker-compose.frontend.yml \
  up --build
# open http://localhost:4180  (login: postyfox / postyfox)
```

## Build and quality

```bash
npm run build        # production build → dist/spa/browser
npm run build-dev    # dev configuration
npm run lint         # eslint (ts + templates), translation key check, UK English spelling check
npm test             # Vitest unit tests (jsdom, no browser needed)
```

## Localisation

UI text lives in `public/i18n/<lang>.json` and is loaded at runtime by
[Transloco](https://jsverse.gitbook.io/transloco) (en-GB is the source language). Templates use
`*transloco="let tr"` and `tr('area.key')`; code uses `translate('area.key')`. Translations are
synced from Crowdin (`crowdin.yml`). To add a language, add its code and native name to `LANGUAGES`
and its Angular locale data to `LOCALE_DATA` in `src/app/core/i18n/i18n.ts`. The UI language comes
from the navbar picker (stored per-browser), else the browser's languages, else en-GB. `npm run lint`
fails on keys used but not defined, or defined but unused.

## Project layout

```
src/app/
  core/            models, typed API services, auth, guard, interceptor, toast/confirm
  layout/          Materio shell (sidebar, navbar, user menu)
  shared/          reusable UI (page header, empty state, status badge, dialogs)
  features/        dashboard, compose, posts + post-status, connectors, templates, text-templates,
                   tag-presets, triggers, api-keys, access (account delegation), settings, admin,
                   terms (acceptance) + tos (public view), privacy-policy
src/styles/        Materio-inspired Bootstrap theme (variables + layout)
public/i18n/       translation files
deploy/            gateway fragments + compose overlays (dev) and the Helm chart (prod)
docs/              deployment and observability notes, decision records (DECISIONS.md)
```
