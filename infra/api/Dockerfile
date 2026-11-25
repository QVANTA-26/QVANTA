# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# build: install the npm workspace, generate the Prisma client, compile the
# shared @qvanta/types package (the API requires it at runtime) and the API.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Prisma's query engine needs OpenSSL on Alpine.
RUN apk add --no-cache openssl

# The workspace is installed from the lockfile so the image is deterministic.
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
RUN npm ci

RUN npm --workspace api run prisma:generate
RUN npm --workspace @qvanta/types run build
RUN npm --workspace api run build

# ---------------------------------------------------------------------------
# runtime: production image with the compiled server only.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/apps/api ./apps/api
COPY --from=build /app/packages ./packages
# The curriculum seeder reads this file relative to the compiled seeders folder.
COPY --from=build /app/apps/web/src/data/curriculum.json ./apps/web/src/data/curriculum.json

EXPOSE 3001

# Run pending migrations on every boot, then start the API server. `exec` makes
# node PID 1 so Render's SIGTERM reaches it for a clean shutdown.
CMD ["sh", "-c", "npx prisma migrate deploy --schema apps/api/prisma/schema.prisma && exec node apps/api/dist/main.js"]
