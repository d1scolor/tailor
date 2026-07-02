FROM node:26-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

FROM node:26-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .
RUN npm run build

FROM node:26-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
LABEL org.opencontainers.image.licenses="AGPL-3.0-only" \
      org.opencontainers.image.source="https://github.com/d1scolor/tailor"
RUN apt-get update && apt-get install -y --no-install-recommends tini ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/messages ./messages
COPY --from=build /app/LICENSE /app/COPYRIGHT ./
COPY --from=build /app/src/lib/currency-config.json ./src/lib/currency-config.json
COPY --from=build /app/src/lib/locale-config.json ./src/lib/locale-config.json
COPY --from=build /app/src/lib/db/migrations ./src/lib/db/migrations
COPY --from=build /app/scripts/bootstrap.mjs ./scripts/bootstrap.mjs
COPY --from=build /app/scripts/entrypoint.sh ./scripts/entrypoint.sh
RUN chmod +x /app/scripts/entrypoint.sh \
  && mkdir -p /data/db /data/photos/originals /data/photos/display /data/photos/thumbs \
  && chown -R node:node /data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
ENTRYPOINT ["tini", "--", "/app/scripts/entrypoint.sh"]
