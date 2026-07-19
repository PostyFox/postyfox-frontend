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

## CI / CD

Mirrors the core repo's split:

- **`.github/workflows/frontend-ci.yml`** (`frontend-ci`) — lint, production build and unit tests on
  every push/PR; on a push to `main` it builds the container image and pushes it to
  `ghcr.io/<owner>/postyfox-frontend:<sha>`. Every environment runs this one production image (the
  SPA is same-origin `/api` + `/oauth2` everywhere, so there is no per-environment build).
- **`.github/workflows/deploy.yml`** (`deploy`) — triggered by a successful `frontend-ci` run on
  `main`. Dev runs directly on the self-hosted runner node (the same box and `/opt/postyfox/dev`
  layout core deploys to), copies this repo's overlay + gateway fragments locally, then uses the
  latest successful `frontend-ci` build from `main` to roll the `frontend` service into the running
  core stack. Manual dispatches use the same latest successful `frontend-ci` SHA for both dev and
  prod. Production still uses SSH to the target host:

  ```
  docker compose -f docker-compose.server.yml -f docker-compose.<env>.yml \
                 -f docker-compose.frontend.server.yml up -d --no-deps frontend
  docker compose ... restart gateway   # reload conf.d → SPA upstream + root route
  ```

  Dev deploys automatically; **production is gated** by the GitHub `production` environment's
  protection rules. Requires the same secrets as core: `DEPLOY_HOST`, `DEPLOY_USER`,
  `DEPLOY_SSH_KEY` (and optional `DEPLOY_PORT`), plus the server being logged in to GHCR.

  > The frontend is an overlay on core's stack, so a core deploy that rewrites `gateway/conf.d`
  > will drop the SPA's two fragments until the next frontend deploy re-applies them.

## Wiring behind the core edge

The core gateway is a single nginx reverse proxy composed from **`conf.d` fragments**, so routing
ownership is cleanly split — the frontend never redefines core's API routes. The core base
(`postyfox-core/deploy/gateway/nginx.conf`) does `include conf.d/upstreams/*.conf` (http context)
and `include conf.d/routes/*.conf` (inside its one `server`), loading fragments in filename order:

```
postyfox-core/deploy/gateway/
  nginx.conf                       # thin base: map, includes, shared proxy headers, /healthz
  conf.d/upstreams/backends.conf   # upstream core / upstream post
  conf.d/routes/10-apis.conf       # /api/posts,/api/webhooks,/swagger-post,/openapi-post → post
                                   # /api/, /swagger, /openapi → core   (explicit)
  conf.d/routes/90-root.conf       # catch-all: / → core   (core-only default)
```

This repo contributes just its own two fragments — **no API routing**:

```
postyfox-frontend/deploy/gateway/
  conf.d/upstreams/frontend.conf   # upstream frontend { server frontend:80; }
  conf.d/routes/90-root.conf       # / → frontend   (SPA static + client-side routes)
```

The overlay (**`deploy/docker-compose.frontend.yml`** for local dev, which *builds* the image;
**`deploy/docker-compose.frontend.server.yml`** for CI/server, which *pulls* the GHCR image) adds
the `frontend` service and bind-mounts those two fragments into the gateway's `conf.d`:
`upstreams/frontend.conf` is additive, and
`routes/90-root.conf` is layered **over** core's file at the same path, so the catch-all flips from
core to the SPA. Core's explicit `/api/`, `/swagger`, `/openapi` routes still win by longest-prefix
match, so the API and docs stay reachable. Because nginx can't merge `location` blocks across
separate `server` blocks, this include-based composition (not multiple servers) is what lets each
side own a file.

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
