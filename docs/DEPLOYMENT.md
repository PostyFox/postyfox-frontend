# PostyFox frontend — architecture & deployment

The frontend is an **Angular 19 SPA** (Materio-inspired Bootstrap 5 theme). It holds **no tokens**:
authentication is owned entirely by the **oauth2-proxy** edge that fronts the PostyFox platform.

## How auth works

```
                 ┌─────────────┐   OIDC    ┌───────────┐
  Browser ─────▶ │ oauth2-proxy │ ────────▶ │ Keycloak  │
                 └──────┬──────┘            └───────────┘
        session cookie  │ forwards Authorization: Bearer
                        ▼
                 ┌─────────────┐   /api/posts,/api/webhooks ──▶ post-api
                 │   gateway   │   /api/* ───────────────────▶ core-api
                 │   (nginx)   │   everything else ──────────▶ frontend (SPA)
                 └─────────────┘
```

- The SPA is served **through** the proxy, so by the time it loads the user already has a valid
  Keycloak session cookie. If the session is missing/expired, the proxy redirects to Keycloak.
- Every browser request is **same-origin**. `/api/*` calls carry the session cookie; the proxy
  attaches the validated `Authorization: Bearer` token to the upstream request.
- The app reads `/oauth2/userinfo` for the signed-in identity and drives sign-out via
  `/oauth2/sign_out`. A `401` from any `/api/*` call triggers a re-auth redirect
  (`/oauth2/sign_in`) — see `src/app/core/interceptors/auth.interceptor.ts`.

Because of this, there is **no OIDC client config in the browser** — no issuer, client id, or PKCE.
That responsibility lives in `deploy/oauth2-proxy/oauth2-proxy.cfg` in the core repo.

## The container

`Dockerfile` builds the SPA and serves the static bundle with nginx (`nginx.conf`), which does the
SPA deep-link fallback to `index.html`. The image only serves static files — it never handles API
or `/oauth2` traffic (the gateway routes those elsewhere).

- `BUILD_ENV=production` (default) → `ng build --configuration production`
- `BUILD_ENV=dev` → `ng build --configuration dev`

CI (`.github/workflows/build.yml`) builds both and deploys to Azure Container Apps.

## Wiring behind the core edge

The core gateway (`postyfox-core/deploy/gateway/nginx.conf`) must route non-API paths to this SPA.
Two artifacts are provided:

- **`deploy/gateway.nginx.conf`** — a drop-in replacement for the core gateway config that adds a
  `frontend` upstream and the SPA/API path split.
- **`deploy/docker-compose.frontend.yml`** — an overlay that adds the `frontend` service to the core
  stack and re-points the gateway at the config above.

### Run the full stack locally

```bash
cd ../postyfox-core/deploy
docker compose \
  -f docker-compose.yml \
  -f ../../postyfox-frontend/deploy/docker-compose.frontend.yml \
  up --build
```

Then open **http://localhost:4180**, sign in as `postyfox` / `postyfox`, and you land in the SPA
with the APIs fully wired.

## Local UI development (`ng serve`)

For fast hot-reload iteration:

```bash
npm start          # ng serve on http://127.0.0.1:4200
```

`proxy.conf.json` forwards `/api` and `/oauth2` from the dev server to a running edge on
`http://localhost:4180`, so you need the core stack (or at least Keycloak + oauth2-proxy + gateway)
running.

**Logging in during dev:** cookies on `localhost` are not port-specific, so sign in **once** at
`http://localhost:4180`; the resulting session cookie is then also sent from `http://localhost:4200`,
and the dev-server proxy forwards it to the edge. If you hit a `401`, the app redirects you through
the proxy to re-authenticate. For anything auth-sensitive, prefer running the full overlay stack
above.
