# PostyFox frontend: architecture & deployment

The frontend is an **Angular 22 SPA** (Materio-inspired Bootstrap 5 theme). It holds **no tokens**:
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
  (`/oauth2/sign_in`). See `src/app/core/interceptors/auth.interceptor.ts`.

Because of this, there is **no OIDC client config in the browser**: no issuer, client id, or PKCE.
That responsibility lives in `deploy/oauth2-proxy/oauth2-proxy.cfg` in the core repo.

## The container

`Dockerfile` builds the SPA (Node 24) and serves the static bundle with nginx (`nginx.conf`), which
does the SPA deep-link fallback to `index.html`. The image only serves static files. It never handles
API or `/oauth2` traffic (the gateway routes those elsewhere). `docker-entrypoint.sh` writes the
operator name and contact (`OPERATOR_NAME`, `OPERATOR_CONTACT`) into a JSON asset at startup, so one
image serves every deployment.

- `BUILD_ENV=production` (default) → `ng build --configuration production`
- `BUILD_ENV=dev` → `ng build --configuration dev`

## CI / CD

Mirrors the core repo's split:

- **`.github/workflows/pr.yml`** (`PR Validation`): lint, production build, unit tests and helm
  lint on every PR.
- **`.github/workflows/build.yml`** (`Build`): on a push to `main` (or manual dispatch) reruns PR
  Validation, then builds the image and pushes `ghcr.io/postyfox/postyfox-frontend:<sha>`, with
  the next semver (Conventional Commits) baked in as `<x.y.z>+<short sha>`. Every environment runs
  this one production image (the SPA is same-origin `/api` + `/oauth2` everywhere).
- **`.github/workflows/deploy.yml`** (`Deploy`): takes a branch, tag or SHA and ships the images
  Build pushed for it, building first if a ref has none.
  - **development**: automatic after each successful main Build, or manual for any ref.
    Runs on the self-hosted runner, copies this repo's overlay + gateway fragments into
    `/opt/postyfox/dev` and rolls the `frontend` service into the running core stack.
  - **production**: manual only, for commits on `main` or published release tags. After
    `production` environment approval it deploys **its own Helm release**
    (`deploy/helm/postyfox-frontend`) into the same `postyfox` namespace as postyfox-core's
    release, via `helm upgrade --install`. Requires a `KUBE_CONFIG` secret on the `production`
    environment (base64-encoded kubeconfig, same cluster/namespace as core).
- **`.github/workflows/release.yml`** (`Release`): tags `vX.Y.Z` (computed from the PRs since the last
  tag, or given), writes the notes, builds the image at the tag and attaches a deploy zip with the
  packaged chart, all as a draft. Deploy the tag to development and check it.
- **`.github/workflows/publish-release.yml`** (`Publish Release`): publishes the draft. Production
  refuses a release tag until this has run.

  > Unlike dev (which drops gateway conf.d fragments onto core's shared nginx), prod wiring is
  > declarative: set `gateway.frontend.enabled: true` (+ `serviceName`/`servicePort` matching this
  > chart's Service, default `postyfox-frontend`) in postyfox-core's `values-prod.yaml`. Core's
  > gateway then proxies `/` to this release's Service via an nginx resolver + variable
  > `proxy_pass`, degrading gracefully to the maintenance page if this release isn't deployed yet
  > (rather than needing this repo to touch core's config at all).

## Wiring behind the core edge

The core gateway is a single nginx reverse proxy composed from **`conf.d` fragments**, so routing
ownership is cleanly split: the frontend never redefines core's API routes. The core base
(`postyfox-core/deploy/gateway/nginx.conf`) does `include conf.d/upstreams/*.conf` (http context)
and `include conf.d/routes/*.conf` (inside its one `server`), loading fragments in filename order:

```
postyfox-core/deploy/gateway/
  nginx.conf                       # thin base: map, includes, shared proxy headers, /healthz
  conf.d/upstreams/backends.conf   # upstream core / upstream post
  conf.d/routes/05-maintenance.conf # maintenance flag + error-page fallback
  conf.d/routes/10-apis.conf       # /api/posts,/api/webhooks,/swagger-post,/openapi-post → post
                                   # /api/, /swagger, /openapi → core   (explicit)
  conf.d/routes/20-otlp.conf       # /otlp/v1/traces → otel-collector (browser telemetry)
  conf.d/routes/90-root.conf       # catch-all: / → core   (core-only default)
```

This repo contributes just its own two fragments, **no API routing**:

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

## Helm chart

`deploy/helm/postyfox-frontend` deploys the nginx image as a `Deployment` + `Service`, with an
optional `Ingress`. Production installs it as the `postyfox-frontend` release in the
`postyfox` namespace; core's gateway proxies `/` to its Service, so the chart's own ingress stays off.

```bash
helm upgrade --install postyfox-frontend deploy/helm/postyfox-frontend \
  --namespace postyfox \
  -f deploy/helm/postyfox-frontend/values-prod.yaml \
  --set image.tag=<commit sha>
```

Key values (defaults in `values.yaml`, production overlay in `values-prod.yaml`):

| Value | Default | Notes |
|-------|---------|-------|
| `image.repository` | `ghcr.io/postyfox/postyfox-frontend` | |
| `image.tag` | chart `appVersion` | CI sets the commit SHA, including when deploying a release tag |
| `replicaCount` | `1` | `2` in production |
| `operator.name`, `operator.contact` | empty | Injected at container start into the privacy policy (`docker-entrypoint.sh`); empty leaves placeholders |
| `service.port` / `service.targetPort` | `80` / `80` | Must match core's `gateway.frontend.servicePort` |
| `ingress.enabled`, `ingress.host`, `ingress.tls` | `false`, empty, `[]` | Only for running without core's gateway |
| `resources` | `{}` | Production sets 50m/64Mi requests, 500m/512Mi limits |
| `autoscaling.*` | disabled | Unused: the chart has no HPA template |

See `values.yaml` for the rest (service account, pod security context, scheduling).
