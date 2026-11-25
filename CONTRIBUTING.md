# Contributing to QVANTA

QVANTA is a monorepo with a React/Vite web app, an Express API, a Python simulator,
and shared TypeScript packages. Keep changes small, reproducible, and explicit about
which runtime boundary they affect.

## Before opening a change

1. Read the relevant repository and product documentation in `docs/`.
2. Use Node.js 22 from `.nvmrc` and install from `package-lock.json` with `npm ci`.
3. Keep secrets in local `.env` files; commit only `.env.example` templates.
4. Preserve existing local/demo fallbacks unless the change intentionally removes one.

## Required checks

From the repository root:

```bash
npm test
npm run prisma:generate
npm run typecheck
npm run build
```

If GNU Make is available, `make test` runs the same repository gates. Run
`npm run docker:check` when the web image or deployment files change.

## Change expectations

- Add or update a meaningful check when behavior changes.
- Keep user-visible copy accurate about demo/local behavior and backend boundaries.
- Do not commit credentials, production URLs, customer data, generated secrets, or
  private logs.
- Keep legal text and data-flow documentation synchronized with new integrations.
- For a release, use a semantic tag such as `v0.1.0`; the release workflow publishes
  the web image to GHCR but does not deploy infrastructure.

## Pull requests

Describe the user-visible outcome, changed runtime boundaries, checks that ran, and
known limitations. Include screenshots or a short screen recording for meaningful UI
changes when practical.
