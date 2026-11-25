# Product baseline and non-functional requirements

## Product baseline

The current QVANTA baseline is a browser-based quantum-computing learning product
with these repository-backed areas:

- a React/Vite web application with public and authenticated routes;
- a drag-and-drop circuit builder with a code representation and simulation result
  views;
- a Node/Express API for authentication, users, circuits, lessons, tutor,
  simulations, billing, admin, and health routes;
- a Python FastAPI/Qiskit simulator for supported circuit representations;
- lesson/progress, tutor conversation, usage-limit, and subscription flows in the
  existing application code;
- a source-backed 39-part, 527-module curriculum explorer at `/curriculum`, with
  searchable module content, local progress, sequential navigation, and tutor handoff;
- shared TypeScript types and UI components in `packages/types` and `packages/ui`.

The baseline is intentionally limited to the behavior already represented by the
source and existing product documentation. Repository foundation work does not add
new backend endpoints, storage, integrations, or product screens.

## Non-functional requirements

| Area | Requirement | Evidence |
| --- | --- | --- |
| Reproducibility | Use Node.js 22 and the checked-in npm lockfile for JavaScript dependencies. | `.nvmrc`, `npm ci`, `npm test` |
| Build integrity | Workspace typechecks and production builds must pass before merge. | `npm run typecheck`, `npm run build` |
| Container integrity | The production web Dockerfile must build from the repository root. | `npm run docker:check` |
| Offline verification | Repository metadata verification must not need a network connection or application services. | `npm test` |
| Configuration | Runtime integrations are configured through environment variables and examples, not committed secrets. | `*.env.example`, `docs/security-privacy.md` |
| Release traceability | Published web images are tied to version tags and the GitHub commit that built them. | `docs/ci-cd.md`, `release.yml` |
| Scope control | CI/release automation must not silently claim to deploy API, simulator, database, or Redis infrastructure. | Release limitations in `docs/ci-cd.md` |
| Curriculum integrity | The checked-in curriculum data must verify to 527 sequential modules across 39 parts before merge. | `npm run curriculum:verify`, `npm test` |

No latency, availability, capacity, or retention target is declared here because
the repository does not currently define one. Such a target should be added with a
measurement and an owner before being treated as an acceptance requirement.

## Exact command surface

From the repository root:

```bash
# Setup
npm ci

# Run locally (three terminals for the full local flow)
npm --workspace api run dev
npm --workspace web run dev
# Optional simulator, from apps/simulator with its Python environment active:
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Test/build
npm test
npm run prisma:generate
npm run typecheck
npm run build
make test

# Local web image
docker build --file infra/web/Dockerfile --tag qvanta-web:local .
docker run --rm --publish 8080:80 qvanta-web:local
```

The existing README remains the source for the full environment setup, smoke path,
and optional infrastructure commands.
