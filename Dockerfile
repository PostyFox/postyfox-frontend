# Stage 1 — build the Angular application (Angular 21 requires Node >= 22.12 / 24)
FROM node:22-alpine AS build

# production | dev — selects the Angular build configuration
ARG BUILD_ENV=production

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN if [ "$BUILD_ENV" = "dev" ]; then \
      npm run build-dev; \
    else \
      npm run build -- --configuration production; \
    fi

# Stage 2 — serve the static assets with nginx
FROM nginx:alpine

# SPA-aware server config (client-side routing fallback + asset caching).
COPY nginx.conf /etc/nginx/conf.d/default.conf

# The Angular `application` builder emits the browser bundle under dist/spa/browser.
COPY --from=build /app/dist/spa/browser /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
