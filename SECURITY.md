# Security policy

## Supported versions

This repository is an active build-stage product. Security fixes should target the
default branch and the latest tagged web image. Operators should rebuild images after
security updates rather than relying on an old `latest` image.

## Reporting a vulnerability

Do not open a public issue with credentials, tokens, private payloads, or an exploitable
proof of concept. Send a minimal report to the monitored security contact configured by
the service operator. The repository currently uses an intentional placeholder:

`[PLACEHOLDER SECURITY CONTACT EMAIL]`

Replace that address before production launch and restrict reports to authorized
maintainers. Include the affected component, reproduction steps, impact, and a safe
suggested mitigation. Remove secrets from the report and use synthetic data.

## Security boundaries

- Never commit `.env` files, API keys, JWT secrets, Stripe credentials, OAuth secrets,
  database passwords, or provider tokens.
- Treat the local demo account and Docker Compose credentials as development-only.
- Do not put personal, regulated, confidential, or research-sensitive content into
  local/demo tutor prompts or circuits.
- Review provider retention and model-training settings before enabling production AI,
  billing, OAuth, analytics, or simulator integrations.
- The GHCR release workflow publishes the web image only; it does not run migrations,
  deploy the API, or configure production infrastructure.

See [`docs/security-privacy.md`](docs/security-privacy.md) and the public
[`/privacy`](apps/web/src/pages/Privacy.tsx) notice for the documented data-flow
boundaries.
