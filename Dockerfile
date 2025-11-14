# Stage 1: Build the Angular application
FROM node:20-alpine AS build

# Build argument to determine environment (production or dev)
ARG BUILD_ENV=production

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the Angular app based on BUILD_ENV argument
RUN if [ "$BUILD_ENV" = "dev" ]; then \
      npm run build-dev; \
    else \
      npm run build -- --configuration production; \
    fi

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy custom nginx configuration (optional)
# COPY nginx.conf /etc/nginx/nginx.conf

# Copy built app from build stage
COPY --from=build /app/dist/spa /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
