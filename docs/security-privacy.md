# Security and privacy boundaries

## Secrets and configuration

- Real credentials belong in local environment files or the deployment secret
  store. Commit only the existing `*.env.example` templates.
- The repository `.gitignore` excludes `.env` and other environment variants.
- `JWT_SECRET`, `JWT_REFRESH_SECRET`, database credentials, Stripe keys, OAuth
  credentials, and `ANTHROPIC_API_KEY` must never be placed in source, workflow
  YAML, or Docker image labels.
- CI uses the GitHub-provided `GITHUB_TOKEN` only to authenticate the GHCR publish.
  The release workflow does not require or request other secrets.

## Application boundaries

- The browser talks to the web application and its configured API routes. The API
  is the boundary for authentication, authorization, validation, usage limits, and
  integrations.
- Access and refresh tokens are handled by the existing API authentication flow;
  protected routes require the API's JWT middleware and administrative routes have
  role checks.
- PostgreSQL stores application records through Prisma. Redis is used by the
  existing API/simulator paths when configured; local Compose data is not a
  production backup or retention policy.
- Google OAuth, Stripe, and Anthropic are optional integrations. When enabled,
  information needed for their respective flows leaves the application boundary;
  operators must review their contracts and retention settings before production
  use.

## Privacy boundary

The repository foundation adds no analytics, tracking, user-data export, or new
third-party data flow. The web app now includes a plain-language baseline Terms of
Service and Privacy Policy at `/terms` and `/privacy`; those pages contain explicit
placeholders and are not a substitute for operator- and jurisdiction-specific legal
review. Product operators remain responsible for documenting actual legal bases,
retention periods, deletion processes, and compliance controls for the environment
they deploy.

Do not treat demo-mode defaults, test Stripe identifiers, placeholder OAuth values,
or the local Docker Compose credentials as production configuration.

## Release and deployment boundary

The GHCR workflow builds and publishes the static web image only. It does not apply
infrastructure, run database migrations, launch API/simulator processes, or receive
production credentials. Those actions require a separately reviewed deployment
system and environment-specific controls.
