# QVANTA — Quantum Computing Education SaaS

QVANTA is a production-grade, multi-tenant SaaS platform for interactive quantum computing education. The MVP ships with: structured auth, a 3D drag-drop circuit builder (React Three Fiber), synced Monaco Qiskit editor, Qiskit Aer simulation with measurement histograms, animated 3D Bloch spheres, a 3D virtual human AI tutor with lip-sync and optional Claude RAG, and Stripe Free/Pro tiers.

## Monorepo Structure

```
.
├── apps/
│   ├── web/          # React + Vite + Tailwind frontend (3D builder, Monaco, tutor)
│   ├── api/          # Node.js Express platform API (auth, billing, circuits, tutor dispatch)
│   └── simulator/    # Python FastAPI quantum simulation microservice (Qiskit Aer + Redis)
├── packages/
│   ├── types/        # Shared TypeScript types (Circuit, GateOp, TutorMessage, etc.)
│   └── ui/           # Shared React component library + Tailwind preset
└── infra/
     ├── docker-compose.yml     # Postgres 16 + Redis 7 (pgvector optional)
    ├── api/Dockerfile         # API service image
    ├── simulator/Dockerfile   # Simulator microservice image
    ├── web/Dockerfile         # Web frontend image
    └── .github/workflows/ci.yml  # CI gates; release.yml publishes tagged web images
```

## Quick Start (10 steps, 5–10 minutes)

1. **Prerequisites**: Docker + Docker Compose, Node.js 20 (the pinned version is in `.nvmrc`), Python 3.11+, npm.

2. **Start infrastructure** (Postgres + Redis; pgvector is optional):
   ```bash
   docker compose -f infra/docker-compose.yml up -d
   ```

3. **Install npm dependencies** at the monorepo root:
    ```bash
    npm ci
    ```

4. **Copy + fill the env templates** (leave third-party keys blank for demo mode):
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
     cp apps/simulator/.env.example apps/simulator/.env
     ```
     For the checked-in 527-module curriculum, keep `SEED_CURRICULUM=1` in
     `apps/api/.env`. The API seeds stable numeric module ids so lesson progress,
     checkpoints, and tutor retrieval share the same source-backed curriculum.
     Demo-mode notes: the platform runs without `GOOGLE_*`, `STRIPE_*`, or `ANTHROPIC_API_KEY` — Stripe CTA buttons are still present, and the tutor falls back to a keyword-driven canned-reply path.

    On a local web host (`localhost`, `127.0.0.1`, or `::1`), the login page exposes a
    development-only demo ID so the authenticated UI can be tried without the API:

    ```text
    Email:    dev@qvanta.ai
    Password: dev-password
    ```

    This account is not a production identity and must not be enabled or reused as a
    real deployment credential.

5. **Install Python simulator dependencies** (optional — usage-guard already validates simulator liveness at request time; skip for quick smoke-test):
   ```bash
   cd apps/simulator
   python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

6. **Initialize Prisma schema + run migrations** in the API:
   ```bash
   npm --workspace api run prisma:generate
   npm --workspace api run prisma:migrate
   ```

7. **Start the FastAPI simulator** (terminal 1, or background):
   ```bash
   # From apps/simulator with venv active:
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   Or, if Python env is not set, the API still boots; simulator requests return a 503 that surfaces cleanly in the UI.

8. **Start the Node platform API** (terminal 2):
   ```bash
   npm --workspace api run dev
   ```
   Listens on `http://localhost:3001`. Seeds an admin user from `ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH` on first boot.

9. **Start the Vite web frontend** (terminal 3):
   ```bash
   npm --workspace web run dev
   ```
   Vite proxies `/api` → `localhost:3001`. Open `http://localhost:5173`.

10. **Smoke-test the MVP happy-path**:
    1. Register a local email/password user (no Google OAuth needed for dev).
    2. Dashboard loads → modules list + usage meter (0/50 Free tier).
    3. Open *Circuit Builder* → drag H onto q0·t0, drag CNOT(q0→q1) to t1 → add Measure on both at t2 → click **Simulate** (1024 shots). Bell histogram should show ~50% `00` and ~50% `11`.
    4. Open *AI Tutor* → ask "What does H do?" → reply should include the keyword "superposition" → TTS plays → 3D mouth visemes animate between closed/A/O → refresh the page → conversation history persists.
    5. *Billing* page shows the Free tier. Clicking Upgrade opens the Stripe checkout (mocked checkout session in test mode).

## Learning Lab

The authenticated **Learn** workspace is available at `/learn` and is linked from the
sidebar. It provides a guided learning loop without replacing the existing Dashboard,
Circuit Builder, or AI Tutor:

- **Roadmap**: four beginner-friendly chapters with short lesson steps, resumable progress,
  prediction checkpoints, mastery, XP, and a 3D Bloch-sphere-style state playground. Apply
  H, measure, reset, and orbit the scene with the pointer.
- **Progress sync**: the web client prefers authenticated `/lessons/progress` persistence
  and falls back to versioned browser storage when the API is unavailable. The API stores
  last step, checkpoint state, mastery, XP, and attempt history per learner.
- **Checkpoints**: source-backed course checkpoints are derived from explicit lesson
  checkpoint content. Structured quizzes can provide answer keys; checklist content is
  self-attested rather than scored from invented answers.
- **Contests**: beginner/intermediate challenge briefs with filters and local join/leave
  state. Use Circuit Builder to create the actual circuit for a challenge.
- **Discussions**: searchable topic filters, local upvotes, thread preview, and a local
  composer for practicing explanations before a backend discussion service is connected.
- **Full Curriculum**: the authenticated `/curriculum` explorer renders the attached,
  source-backed 39-part / 527-module curriculum with search, part and level filters,
  progress, sequential navigation, exact section content, module-specific circuits,
  checkpoints, and a handoff into the virtual tutor.

The public `/` landing page now previews these three entry points and the visual-learning
approach. Existing `/home` showcase sections remain available from the landing page.

## Tiered Plans

| Tier   | Sims / month | Max shots | Builder     | Tutor     | Instructor panels |
|--------|--------------|-----------|-------------|-----------|-------------------|
| Free   | 50           | 1024      | 3D + 2D     | Demo mode | —                 |
| Pro    | Unlimited    | 65536     | 3D + 2D     | Claude RAG| —                 |
| Inst.  | Per seat     | 65536     | 3D + 2D     | Claude RAG| Classroom dash    |

## AI Tutor — Dual-Path Mode

`tutor.service.ts` in `apps/api` operates in two modes, auto-detected at boot:

- **Claude mode** (when `ANTHROPIC_API_KEY` is set): calls `claude-3-haiku-20240307` with a system prompt that injects (1) course-module/keyword RAG snippets from `CourseModule.mdxContent`, (2) the current circuit JSON AST, (3) pre-flight heuristic circuit warnings — missing Measure gates, self-target CNOT, out-of-range qubit indices. Up to 8 prior turns are threaded for context.
- **Demo mode** (no key): falls back to an enhanced keyword-coaching engine, so tutor UX works fully locally without secrets. RAG uses substring keyword scoring on course modules.

## MVP Acceptance Criteria Checklist

| #  | Criterion                                                                                  | Status |
|----|--------------------------------------------------------------------------------------------|--------|
| 1  | Monorepo apps/{web,api,simulator}, packages/{ui,types}, infra/ all present and buildable  | ✅      |
| 2  | Register / login (email + Google OAuth routes), JWT refresh, role-based guards            | ✅      |
| 3  | 3D drag-drop circuit builder (qubit rails, gate snap, keyboard nav, 2D fallback)          | ✅      |
| 4  | Monaco Qiskit editor ↔ 3D scene bidirectional sync with parse-error markers              | ✅      |
| 5  | Bell circuit simulation returns ~00 + ~11 counts; histogram renders via Recharts          | ✅      |
| 6  | Tutor replies with "superposition" for H-gate Q; 3D avatar TTS with lip-sync; persistence | ✅      |
| 7  | Stripe Free (50 sim cap) / Pro tiers; webhook → user.tier; usage-guard throws 402 at cap  | ✅      |
| 8  | Per-qubit Bloch spheres; step-through animation shows |0⟩→|+⟩ after H                   | ✅      |
| 9  | Mobile-responsive sidebar + Lite 2D SVG fallback toggle                                   | ✅      |
| 10 | `npm -w @qvanta/types/ui build`, `npm -w api typecheck`, `npm -w web build` all exit 0    | ✅      |

## Reproducible checks and deployment

From the repository root, with dependencies installed from `package-lock.json`:

```bash
# Install exactly the versions recorded in package-lock.json.
npm ci

# The offline-friendly repository, typecheck, and production-build checks.
npm test
npm run prisma:generate
npm run typecheck
npm run build

# The complete repository check target, including Prisma client generation.
make test
```

`npm test` validates the workspace and lockfile metadata without network access. After
dependencies have been installed, Prisma generation, typechecking, and building also
run locally without calling application services. `make test` runs the repository
verification, Prisma generation, typecheck, and build. The equivalent commands are
shown above when GNU Make is not available.

Build and run the production web container with the repository Dockerfile:

```bash
make docker-check
# or: npm run docker:check
docker run --rm -p 8080:80 qvanta-web:ci
```

Open `http://localhost:8080`. The nginx configuration falls back to `index.html`, so
client-side routes such as `/learn` continue to work after a refresh.

The repository foundation and release boundaries are documented in:

- [`docs/architecture.md`](docs/architecture.md) — current runtime and workspace boundaries.
- [`docs/ci-cd.md`](docs/ci-cd.md) — CI gates, GHCR publishing, and deployment limitations.
- [`docs/product-baseline.md`](docs/product-baseline.md) — product baseline and non-functional requirements.
- [`docs/security-privacy.md`](docs/security-privacy.md) — secrets, data-flow, and privacy boundaries.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — contribution and release expectations.
- [`SECURITY.md`](SECURITY.md) — vulnerability reporting and security boundaries.

Public legal baseline pages are available at `/terms` and `/privacy`. They are
plain-language templates with intentional placeholder contact details; replace them
and obtain counsel review before a production launch.
