# CI/CD and release process

## Continuous integration

`.github/workflows/ci.yml` runs for pull requests and pushes to `main`:

1. Checkout the repository.
2. Select Node.js 20 from `.nvmrc`.
3. Run `npm ci --no-audit --no-fund` from the root. `npm ci` is required so the
   checked-in `package-lock.json` is the install contract.
4. Run `npm test` for the dependency-free repository verification.
5. Run `npm run prisma:generate` to generate the API's local Prisma client.
6. Run `npm run typecheck`; the root command emits shared package declarations
   before checking all workspaces.
7. Run `npm run build`; the root command builds shared packages before the API and
   web applications.
8. Run `npm run docker:check` to build the production web image.

After installation, steps 4–7 use repository files and installed dependencies;
they do not call the API, database, simulator, or third-party AI/billing services.
The Docker step can use cached base images on a developer machine, but a clean CI
runner may need to pull the declared Node and nginx base images.

Run the non-Docker checks locally with:

```bash
npm ci
npm test
npm run prisma:generate
npm run typecheck
npm run build
# or the same checks through Make:
make test
```

Run the container check separately when Docker is available:

```bash
make docker-check
# or: npm run docker:check
```

## Tag release and GHCR publish

`.github/workflows/release.yml` is triggered by `v*` tags and validates that each
tag is `vX.Y.Z` or `vX.Y.Z-*`. It logs in to GitHub Container Registry with the automatically provided
`GITHUB_TOKEN`, builds `infra/web/Dockerfile`, and publishes:

```text
ghcr.io/<owner>/<repository>:<version-without-v-prefix>
ghcr.io/<owner>/<repository>:latest
```

The workflow grants only `contents: read` and `packages: write`. No registry
password, cloud credential, deployment key, or other external secret is required.

To publish a release after merging to the release branch:

```bash
git tag v0.1.0
git push origin v0.1.0
```

## Deployment limitations

The tag workflow publishes the web container; it does not deploy an environment.
It does not provision PostgreSQL or Redis, run Prisma migrations, start the API or
simulator, configure DNS/TLS, or apply Kubernetes/cloud-provider resources. A
deployment operator must pull the published web image and provide the runtime
services and environment configuration separately. The repository currently has
no workflow that claims those operations are automatic.
