# Build from repo root. Deliberately copy only application source, never .env files.
FROM node:22-alpine
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY backend/config ./config
COPY backend/controllers ./controllers
COPY backend/middleware ./middleware
COPY backend/models ./models
COPY backend/routes ./routes
COPY backend/server.js ./server.js
USER node
EXPOSE 5000
CMD ["node","server.js"]
