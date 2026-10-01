FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY ui ./ui
COPY index.html vite.config.js ./
RUN npm run build && npm prune --omit=dev --ignore-scripts
FROM node:22-alpine
ENV NODE_ENV=production PORT=4020
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
COPY --chown=node:node server ./server
USER node
EXPOSE 4020
HEALTHCHECK --interval=20s --timeout=5s CMD node -e "fetch('http://127.0.0.1:4020/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","server/index.js"]
