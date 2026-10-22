.PHONY: test typecheck build docker-check

# Run the same offline-friendly repository checks used by CI, after npm ci.
test:
	npm test
	npm run prisma:generate
	npm run typecheck
	npm run build

typecheck:
	npm run typecheck

build:
	npm run build

# Build the production web image from the repository Dockerfile.
docker-check:
	npm run docker:check
