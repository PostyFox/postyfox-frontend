# PostyFox — frontend

Angular 21 (LTS Version) single-page app for the [PostyFox platform](../postyfox-core). Write a post once and
deliver it to Discord, Telegram, BlueSky and Tumblr; manage connectors, templates, external triggers
and API keys.

- **Framework:** Angular 21 (standalone components, signals)
- **UI:** Bootstrap 5 with a Materio-inspired theme (`src/styles/`)
- **Auth:** cookie session via the oauth2-proxy edge → Keycloak (the browser holds no tokens).
  See [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md).
- **APIs:** the core-api / post-api, consumed same-origin under `/api/*`.

## Prerequisites

- Node.js 22+ and npm
- The core platform running (for API + auth). See `../postyfox-core/README.md`.

## Develop

```bash
npm install
npm start          # ng serve → http://127.0.0.1:4200
```

`proxy.conf.json` forwards `/api` and `/oauth2` to a running edge at `http://localhost:4180`.
Sign in once at http://localhost:4180 (see [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) for why).

## Build & quality

```bash
npm run build        # production build → dist/spa/browser
npm run build-dev    # dev configuration
npm run lint         # eslint (ts + templates)
npm test             # karma/jasmine unit tests
```

## Run the whole stack (SPA + APIs + auth)

```bash
cd ../postyfox-core/deploy
docker compose \
  -f docker-compose.yml \
  -f ../../postyfox-frontend/deploy/docker-compose.frontend.yml \
  up --build
# open http://localhost:4180  (login: postyfox / postyfox)
```

## Project layout

```
src/app/
  core/            models, typed API services, auth, guard, interceptor, toast/confirm
  layout/          Materio shell (sidebar, navbar, user menu)
  shared/          reusable UI (page header, empty state, status badge, dialogs)
  features/        dashboard, connectors, templates, compose, post-status, triggers, api-keys
src/styles/        Materio-inspired Bootstrap theme (variables + layout)
deploy/            gateway config + compose overlay to serve the SPA behind the edge
docs/              deployment & architecture notes
```
