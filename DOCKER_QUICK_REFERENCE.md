# Docker Quick Reference Card

## 🚀 Start Development (Most Common)

```bash
# Terminal 1: Start Docker services
npm run docker:start

# Terminal 2: Start frontend with hot reload
npm run dev:frontend

# Open browser
open http://localhost:3001
```

## 📋 Essential Commands

| Command | What It Does |
|---------|-------------|
| `npm run docker:start` | Start PostgreSQL, Redis, Backend (with pretty output) |
| `npm run docker:stop` | Stop all services |
| `npm run docker:logs` | View logs from all containers |
| `npm run docker:status` | Check health of services |
| `npm run dev:frontend` | Start Next.js locally with HMR |
| `npm run dev` | Start backend + frontend locally (both) |

## 🔍 Check Status

```bash
npm run docker:status
```

Output shows all 4 services and their status.

## 📊 View Logs

```bash
# All services
npm run docker:logs

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
docker compose logs -f redis
```

## 🛠️ Common Tasks

### Run Database Migrations
```bash
docker compose exec backend npm run migration:run
```

### Access PostgreSQL
```bash
docker compose exec postgres psql -U postgres -d github_tracker
```

### Access Redis
```bash
docker compose exec redis redis-cli
```

### Rebuild a Service
```bash
docker compose up -d --build backend
```

### See All Containers
```bash
docker compose ps
```

## 🔄 Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 3000/3001 in use | `lsof -ti:3000 \| xargs kill -9` |
| Services not starting | `npm run docker:clean` then `npm run docker:start` |
| Database connection error | Check `docker compose logs -f postgres` |
| Frontend can't reach backend | Check backend is healthy: `npm run docker:status` |
| Docker not running | Start Docker Desktop |

## 🗑️ Clean Up

```bash
# Stop services only (keep data)
npm run docker:stop

# Stop and remove all data (wipes database!)
npm run docker:clean

# Remove Docker system cache
docker system prune -a
```

## 📍 Service Endpoints

| Service | Local URL | Inside Docker |
|---------|-----------|---------------|
| Frontend | http://localhost:3001 | http://frontend:3001 |
| Backend API | http://localhost:3000 | http://backend:3000 |
| PostgreSQL | localhost:5432 | postgres:5432 |
| Redis | localhost:6379 | redis:6379 |

## 📚 Full Docs

- Quick start guide: `DOCKER_SETUP.md`
- Complete reference: `DOCKER.md`
- Compose config: `docker-compose.yml`

## 💡 Pro Tips

1. **Keep three terminals open:**
   - Docker logs: `npm run docker:logs`
   - Frontend: `npm run dev:frontend`
   - Shell for running commands

2. **Frontend changes auto-reload** — just edit and save

3. **Backend changes auto-rebuild** — thanks to volume mounts

4. **Database persists** — data survives container restarts (unless you run `docker:clean`)

5. **Skip local PostgreSQL/Redis** — Docker handles it all

## ⚡ Speed Tips

- First start takes longer (image building) — ~2 minutes
- Subsequent starts are fast (~5 seconds)
- Code changes hot-reload instantly
- No need to stop/restart unless you change docker-compose.yml

---

**Questions?** Read `DOCKER_SETUP.md` for detailed troubleshooting.
