# Docker Setup - Complete Guide

Your GitHub Tracker project is now fully dockerized! This guide explains how to use Docker for development.

## What's Dockerized

✅ **PostgreSQL 16** - Database
✅ **Redis 7** - Cache & Job Queue
✅ **NestJS Backend** - API Server (Port 3000)
✅ **Next.js Frontend** - React App (Port 3001)

## Installation

### 1. Install Docker Desktop

Download from https://www.docker.com/products/docker-desktop

### 2. Start Docker

Open Docker Desktop application (or `brew services start docker` on macOS).

### 3. Verify Installation

```bash
docker --version
docker compose --version
```

## Quick Start (Recommended for Development)

### Option A: Docker Services + Local Frontend (Recommended)

This is the best setup for frontend development because Next.js HMR works perfectly.

**Terminal 1 — Start Docker services:**
```bash
npm run docker:start
```

**Terminal 2 — Start frontend locally:**
```bash
npm run dev:frontend
```

**Access:**
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000

**Benefits:**
- ✅ PostgreSQL/Redis/Backend in containers (no local installation needed)
- ✅ Next.js HMR works (fast hot reload)
- ✅ Backend auto-reloads on code changes (volume mounts)
- ✅ Easy to develop and test

---

### Option B: Everything in Docker (Production-like)

```bash
npm run docker:rebuild
```

Access: http://localhost:3001

**Note:** Changes to code require rebuild, HMR not available.

---

### Option C: Traditional Local Development (No Docker)

If you prefer everything local:

```bash
# Start local services
brew services start postgresql
brew services start redis

# Start everything
npm run dev
```

## NPM Scripts

```bash
# Start Docker with helpful output
npm run docker:start

# Stop Docker services
npm run docker:stop

# View logs from all containers
npm run docker:logs

# Check service status
npm run docker:status

# Start/stop without the friendly output
npm run docker:up          # Start
npm run docker:down        # Stop

# Rebuild all images
npm run docker:rebuild

# Stop and remove all data (including database!)
npm run docker:clean
```

## Services & Access

| Service | Port | URL | Container | Inside Network |
|---------|------|-----|-----------|-----------------|
| PostgreSQL | 5432 | postgres://postgres:postgres@localhost:5432 | github-tracker-postgres | postgres:5432 |
| Redis | 6379 | redis://localhost:6379 | github-tracker-redis | redis:6379 |
| Backend | 3000 | http://localhost:3000 | github-tracker-backend | http://backend:3000 |
| Frontend | 3001 | http://localhost:3001 | github-tracker-frontend | http://frontend:3001 |

## Common Tasks

### Run Database Migrations

```bash
docker compose exec backend npm run migration:run
```

### Access PostgreSQL CLI

```bash
docker compose exec postgres psql -U postgres -d github_tracker
```

### Access Redis CLI

```bash
docker compose exec redis redis-cli
```

### View Backend Logs

```bash
docker compose logs -f backend
```

### View All Logs

```bash
npm run docker:logs
```

### Rebuild a Specific Service

```bash
docker compose up -d --build backend
```

### Check Container Health

```bash
docker compose ps
```

All should show "healthy" for postgres and redis.

## How to Develop

### Adding Backend Features

1. **Docker services running:**
   ```bash
   npm run docker:start
   ```

2. **Edit code in `src/` directory**

3. **Backend auto-rebuilds** thanks to volume mount

4. **Test in browser:** http://localhost:3000

### Adding Frontend Features

1. **Docker services running:**
   ```bash
   npm run docker:start
   ```

2. **Frontend running locally:**
   ```bash
   npm run dev:frontend
   ```

3. **Edit code in `frontend/` directory**

4. **Changes auto-hot-reload** (Next.js HMR)

5. **Test in browser:** http://localhost:3001

### Database Schema Changes

1. **Create migration:**
   ```bash
   cd .. && npm run migration:generate -- src/migrations/CreateNewTable
   ```

2. **Run migration:**
   ```bash
   docker compose exec backend npm run migration:run
   ```

3. **Verify:**
   ```bash
   docker compose exec postgres psql -U postgres -d github_tracker
   ```

## Troubleshooting

### "Docker daemon is not running"

**Solution:** Start Docker Desktop or run `brew services start docker`

### "Port 3000/3001 already in use"

**Solution 1:** Kill the process
```bash
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

**Solution 2:** Use different ports in `docker-compose.yml`
```yaml
ports:
  - '3000:3000'  # Change first number: '3002:3000'
```

### "Database connection refused"

**Check service is healthy:**
```bash
docker compose ps
# postgres should show "healthy"
```

**If unhealthy, reset:**
```bash
npm run docker:clean
npm run docker:start
```

### "Cannot reach backend from frontend"

**When frontend is local:** It uses http://localhost:3000 (see next.config.ts)

**When frontend is in Docker:** It uses http://backend:3000 (Docker network)

Both are correct. Just make sure services are running.

### "Migrations not running"

**Manual trigger:**
```bash
docker compose exec backend npm run migration:run
```

### "Out of disk space"

**Clean up Docker:**
```bash
docker system prune -a
```

### "Can't see logs"

```bash
# View specific service
docker compose logs backend

# Follow all logs
docker compose logs -f

# Or via npm
npm run docker:logs
```

## File Structure

```
github-tracker/
├── Dockerfile                 # Backend image definition
├── docker-compose.yml         # All services
├── .dockerignore              # What to ignore in Docker build
├── .env                       # Environment variables
├── .env.docker               # Example Docker env vars
├── DOCKER.md                 # Detailed Docker docs
├── DOCKER_SETUP.md           # This file
├── scripts/
│   ├── docker-start.sh      # Startup script
│   └── docker-stop.sh       # Shutdown script
├── src/                       # Backend code (hot-mounted)
├── frontend/
│   ├── Dockerfile           # Frontend image definition
│   ├── .dockerignore        # What to ignore
│   ├── app/                 # Next.js app
│   └── lib/                 # Utilities
└── ...
```

## Network Architecture

```
┌─────────────────────────────────────────────────┐
│          Docker Network (bridge)                │
│                                                 │
│  ┌─────────────┐       ┌──────────────┐       │
│  │  PostgreSQL │       │    Redis     │       │
│  │   :5432     │       │    :6379     │       │
│  └────────┬────┘       └──────┬───────┘       │
│           │                   │                │
│           └─────────┬─────────┘                │
│                     │                          │
│              ┌──────▼──────┐                   │
│              │  Backend    │                   │
│              │  :3000      │                   │
│              │  NestJS     │                   │
│              └──────┬──────┘                   │
│                     │                          │
│        (depends on postgres & redis)           │
│                     │                          │
│              ┌──────▼──────┐                   │
│              │  Frontend   │                   │
│              │  :3001      │                   │
│              │  Next.js    │                   │
│              └─────────────┘                   │
│                                                │
│        (depends on backend)                    │
└─────────────────────────────────────────────────┘
       Host Ports: 3000, 3001, 5432, 6379
```

## Environment Variables

All environment variables are set automatically in docker-compose.yml:

**Database:**
- `DATABASE_HOST=postgres` (Docker service name)
- `DATABASE_PORT=5432`
- `DATABASE_NAME=github_tracker`
- `DATABASE_USER=postgres`
- `DATABASE_PASSWORD=postgres`

**Redis:**
- `REDIS_HOST=redis` (Docker service name)
- `REDIS_PORT=6379`

**Frontend:**
- `NEXT_PUBLIC_API_URL=http://backend:3000` (or http://localhost:3000 when running locally)

**GitHub (from .env):**
- `GITHUB_APP_ID`
- `GITHUB_PRIVATE_KEY`
- `GITHUB_WEBHOOK_SECRET`
- `GITHUB_INSTALLATION_ID`

To override, edit docker-compose.yml environment sections.

## Next Steps

1. **Start Docker:** `npm run docker:start`
2. **Start Frontend:** `npm run dev:frontend`
3. **Open browser:** http://localhost:3001
4. **Login with test credentials** (if configured in backend)
5. **Start building!**

## Production Deployment

This Docker setup is for **development only**.

For production, you'll need:
- Separate docker-compose.prod.yml
- Environment-specific .env files
- Managed PostgreSQL (AWS RDS, etc.)
- Managed Redis (AWS ElastiCache, etc.)
- Docker registry (Docker Hub, ECR, etc.)
- Orchestration (Docker Swarm, Kubernetes, etc.)

See DOCKER.md for more details.

---

**Questions?** Check docker-compose.yml and DOCKER.md for more details.
