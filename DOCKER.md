# Docker Setup Guide

This project is fully dockerized with PostgreSQL, Redis, NestJS Backend, and Next.js Frontend all running in containers via Docker Compose.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose v2.0+
- Node.js 23+ (for local development only, not needed for Docker)

## Quick Start

### Option 1: Docker Containers for Services + Local Dev

Run PostgreSQL, Redis, and Backend in Docker, while running Frontend locally:

```bash
# Start Docker services (postgres, redis, backend)
npm run docker:up

# In another terminal, start frontend locally
npm run dev:frontend
```

Then access:
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000

### Option 2: Everything in Docker (Production-like)

Run the entire stack in containers:

```bash
# Build and start all containers
npm run docker:rebuild

# View logs
npm run docker:logs

# Access services
# Frontend: http://localhost:3001
# Backend API: http://localhost:3000
```

### Option 3: Traditional Local Development

Run backend and frontend locally without Docker:

```bash
# Make sure PostgreSQL and Redis are running locally
brew services start postgresql
brew services start redis

# Start both backend and frontend
npm run dev
```

## Available Commands

```bash
# Start Docker services in background
npm run docker:up

# Stop Docker services
npm run docker:down

# View live logs from all containers
npm run docker:logs

# Rebuild and restart all containers
npm run docker:rebuild

# Stop and remove all data (volumes)
npm run docker:clean
```

## Services & Ports

| Service | Port | Container Name | Notes |
|---------|------|-----------------|-------|
| PostgreSQL | 5432 | github-tracker-postgres | User: postgres / Password: postgres |
| Redis | 6379 | github-tracker-redis | No auth required |
| Backend API | 3000 | github-tracker-backend | NestJS - runs migrations automatically |
| Frontend | 3001 | github-tracker-frontend | Next.js - proxies to backend |

## Environment Variables

When using Docker, environment variables are automatically configured:

- `DATABASE_HOST` → `postgres` (Docker internal network)
- `REDIS_HOST` → `redis` (Docker internal network)
- `NEXT_PUBLIC_API_URL` → `http://backend:3000` (Docker internal)

To override, edit `docker-compose.yml` under each service's `environment` section.

## Volumes & Data Persistence

- `postgres_data` — PostgreSQL database files
- `redis_data` — Redis persistence data

Data persists between container restarts. To clear all data:

```bash
npm run docker:clean
```

## Development Workflow

### When using Docker services + local frontend:

1. **Start Docker services:**
   ```bash
   npm run docker:up
   ```

2. **Watch for changes in backend** — Docker volume mounts src/ for live reloading:
   - Edit files in `src/` → backend auto-rebuilds
   - Edit files in `frontend/` → Next.js HMR works locally

3. **View logs:**
   ```bash
   docker logs -f github-tracker-backend
   docker logs -f github-tracker-postgres
   ```

### When using full Docker stack:

```bash
# Build and run all
npm run docker:rebuild

# Follow logs
npm run docker:logs

# Changes require rebuild:
npm run docker:rebuild
```

## Troubleshooting

### Backend can't connect to PostgreSQL

Check PostgreSQL is healthy:
```bash
docker compose ps
# postgres should show "healthy"
```

If not healthy, try:
```bash
npm run docker:clean
npm run docker:up
```

### Frontend can't reach backend

When running frontend locally, it tries to reach `http://localhost:3000` (see next.config.ts rewrites).

When running frontend in Docker, it reaches `http://backend:3000` (Docker internal network).

### Port already in use

If port 3000/3001 is in use:
1. Kill the process: `lsof -ti:3000 | xargs kill -9`
2. Or change ports in `docker-compose.yml`

### Database migrations not running

Migrations run automatically when backend starts. To run manually:

```bash
# Connect to backend container
docker exec -it github-tracker-backend npm run migration:run
```

### Clear everything and start fresh

```bash
npm run docker:clean
npm run docker:up
```

## Production Considerations

This setup is for development. For production:

1. Use separate `docker-compose.prod.yml` with:
   - No volume mounts for source code
   - No healthchecks with wget (use proper probes)
   - Environment variables from `.env.prod`
   - SSL/TLS configuration
   - Proper log drivers

2. Use a reverse proxy (nginx/traefik)

3. Add proper authentication for PostgreSQL/Redis

4. Use managed database services instead of containers

## Architecture

```
┌─────────────────────────────────────────┐
│         Docker Compose Network          │
│                                         │
│  ┌──────────┐  ┌──────────────────┐   │
│  │PostgreSQL│  │redis             │   │
│  │:5432     │  │:6379             │   │
│  └────┬─────┘  └────┬─────────────┘   │
│       │             │                  │
│       └─────┬───────┘                  │
│             │                          │
│        ┌────▼─────────┐                │
│        │Backend       │                │
│        │:3000         │                │
│        │NestJS API    │                │
│        └────▲─────────┘                │
│             │                          │
│             │ (http://backend:3000)    │
│        ┌────┴─────────┐                │
│        │Frontend      │                │
│        │:3001         │                │
│        │Next.js       │                │
│        └──────────────┘                │
└─────────────────────────────────────────┘
          Host Ports: 3000, 3001, 5432, 6379
```

## Useful Docker Commands

```bash
# View all containers
docker compose ps

# View logs for specific service
docker compose logs backend
docker compose logs frontend
docker compose logs postgres

# Execute command in container
docker compose exec backend npm run migration:run
docker compose exec postgres psql -U postgres -d github_tracker

# Rebuild specific service
docker compose up -d --build backend

# Remove containers but keep volumes
docker compose down

# Remove everything including volumes
docker compose down -v
```

---

For local development without Docker, see the main README.md
