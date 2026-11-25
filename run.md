# Run QVANTA

Run every command from the repository root unless a step says otherwise.

## Windows: recommended Docker setup

Prerequisites:

- Docker Desktop with Docker Compose
- Node.js 22+
- npm 9+
- Python 3.11+ (only for local simulator development)

Start PostgreSQL, Redis, the simulator, the API, and the web app:

```powershell
docker compose -f infra/docker-compose.yml up --build
```

Open http://localhost:8080.

Stop the stack:

```powershell
docker compose -f infra/docker-compose.yml down
```

Remove database and Redis data:

```powershell
docker compose -f infra/docker-compose.yml down -v
```

## Windows: local development

### 1. Install dependencies

```powershell
npm ci
python -m pip install -r apps/simulator/requirements.txt
```

### 2. Create environment files

PowerShell can copy the example files with:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env
Copy-Item apps/simulator/.env.example apps/simulator/.env
```

Third-party credentials can remain blank or use placeholder values for demo mode. Do not commit the generated `.env` files.

### 3. Start PostgreSQL and Redis

```powershell
docker compose -f infra/docker-compose.yml up -d postgres-16 redis-7
```

### 4. Generate Prisma and apply migrations

```powershell
npm --workspace api run prisma:generate
npm --workspace api run prisma:migrate
```

### 5. Start three terminals

Simulator:

```powershell
cd apps/simulator
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API:

```powershell
npm --workspace api run dev
```

Web app:

```powershell
npm --workspace web run dev
```

Open http://localhost:5173.

## macOS and Linux

Docker setup:

```bash
docker compose -f infra/docker-compose.yml up --build
```

Local setup is the same as Windows except environment files can be copied with:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/simulator/.env.example apps/simulator/.env
```

## Service URLs

| Service | Local development | Docker |
|---|---|---|
| Web app | http://localhost:5173 | http://localhost:8080 |
| API | http://localhost:3001 | http://localhost:3001 |
| Simulator | http://localhost:8000 | http://localhost:8000 |
| API health | http://localhost:3001/health | http://localhost:3001/health |
| Simulator health | http://localhost:8000/health | http://localhost:8000/health |

## Verification

Run the repository checks:

```powershell
npm test
npm run typecheck
npm run build
```
