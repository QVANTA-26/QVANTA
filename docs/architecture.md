  # QVANTA architecture

## Scope

This document describes the applications and packages currently present in the
repository. It does not add or assume another service, hosted platform, or data
store.

## Runtime boundary

```text
Browser
  |
  | React + Vite (`apps/web`)
  | /api and /ws requests
  v
Node.js + Express (`apps/api`)
  |\
  | \-- Prisma -> PostgreSQL (configured by `DATABASE_URL`)
  | \-- Redis client (configured by `REDIS_URL`)
  | \-- optional Stripe, Google OAuth, and Anthropic integrations
  |
  \---- HTTP -> Python FastAPI simulator (`apps/simulator`)
                 |\
                 | \-- Qiskit / Qiskit Aer execution
                 \---- optional Redis job state
```

The web development server proxies `/api` and `/ws` to the API. The API validates
simulation requests and forwards them to `SIMULATOR_URL`. The simulator can run
inline when Redis is unavailable; PostgreSQL and Redis are provided for local
development by `infra/docker-compose.yml`.

## Repository boundaries

| Path | Responsibility | Build/check entry point |
| --- | --- | --- |
| `apps/web` | React/Vite frontend, routes, circuit UI, tutor UI, and result views | `npm --workspace web run typecheck`, `npm --workspace web run build` |
| `apps/api` | Express API, authentication, circuits, lessons, tutor, simulations, billing, and admin routes | `npm --workspace api run typecheck`, `npm --workspace api run build` |
| `apps/simulator` | FastAPI/Qiskit simulation service | Python environment and `requirements.txt`; not part of the npm workspace lockfile |
| `packages/types` | Shared TypeScript types | `npm --workspace @qvanta/types run typecheck` and `build` |
| `packages/ui` | Shared React components and Tailwind preset | `npm --workspace @qvanta/ui run build` |
| `infra` | Local infrastructure and container definitions | `npm run docker:check` builds the web image |

## Build artifact

The release workflow builds `infra/web/Dockerfile`. Its build stage installs the
root npm workspace from `package-lock.json`, builds the web workspace, and copies
the resulting static files into nginx. The image is therefore the web delivery
artifact. API, simulator, database, and Redis lifecycle management remain outside
that image and outside the tag-publish workflow.
