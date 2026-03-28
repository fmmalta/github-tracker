# GitHub Tracker - Start Here 👋

Welcome to the GitHub Tracker project! This is your guide to getting started.

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Docker Desktop installed and running
- Node.js 23+

### Run Everything

**Terminal 1:** Start Docker services (PostgreSQL, Redis, Backend)
```bash
npm run docker:start
```

**Terminal 2:** Start Frontend with hot reload
```bash
npm run dev:frontend
```

**Browser:** Open http://localhost:3001

✨ That's it! You now have the full stack running.

---

## 📚 Project Structure

```
github-tracker/
├── src/                    # NestJS Backend
├── frontend/               # Next.js Frontend (Phase 3)
├── docker-compose.yml      # Docker orchestration
├── Dockerfile             # Backend image
├── frontend/Dockerfile    # Frontend image
├── scripts/               # Helper scripts
├── docs/                  # Documentation
└── .planning/             # Planning & roadmap
```

---

## 📖 Important Documentation

| Document | Purpose | Read When |
|----------|---------|-----------|
| **DOCKER_QUICK_REFERENCE.md** | Cheat sheet for docker commands | You need a quick command |
| **DOCKER_SETUP.md** | Step-by-step docker guide | Setting up docker first time |
| **DOCKER.md** | Complete docker reference | Need detailed information |
| **SPEC.md** | Full project requirements | Understanding requirements |
| **.planning/ROADMAP.md** | Phase breakdown & timeline | Understanding phases |

---

## 🔧 Common Tasks

### Frontend Development
```bash
npm run docker:start      # Start services
npm run dev:frontend      # Start Next.js (auto hot-reload)
```

### Check Everything is Running
```bash
npm run docker:status     # See all services
npm run docker:logs       # Follow logs in real-time
```

### Database Work
```bash
# Run migrations
docker compose exec backend npm run migration:run

# Access PostgreSQL
docker compose exec postgres psql -U postgres -d github_tracker
```

### Stop Everything
```bash
npm run docker:stop       # Keep data
npm run docker:clean      # Remove all data
```

---

## 📊 What's Implemented (Phase 3)

✅ **Plan 03-01: Next.js Bootstrap**
- Frontend app with TypeScript strict mode
- Material UI v8 theme
- TanStack Query v5 for data fetching
- JWT authentication
- API client with 401 refresh retry
- Filter hook for URL state

✅ **Plan 03-02: Dashboard Components**
- Sidebar navigation
- Header with user menu
- MetricCard with help popover
- TrendChart (Recharts)
- FilterPanel with date presets
- DisclaimerBanner
- Loading skeletons

🚀 **Plans 03-03 to 03-07: Ready to Start**
- Organization overview page
- Repository pages
- Developer leaderboard
- Pull request explorer
- Developer detail page

---

## 🎯 Development Workflow

### For Frontend Development
1. `npm run docker:start` — Start backend services
2. `npm run dev:frontend` — Start Next.js locally
3. Edit code in `frontend/` → Auto hot-reload
4. Open http://localhost:3001

### For Backend Development
1. `npm run docker:start` — Start services
2. Edit code in `src/` → Auto-rebuild
3. Test at http://localhost:3000

### Adding Features
- Backend: Add to `src/`, rebuild happens automatically
- Frontend: Add to `frontend/`, HMR happens instantly
- Database: Create migration, run `docker compose exec backend npm run migration:run`

---

## 🆘 Troubleshooting

### "Docker not running"
```bash
# Start Docker Desktop app
# Or: brew services start docker
```

### "Port 3000/3001 already in use"
```bash
# Kill the process
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

### "Database connection error"
```bash
npm run docker:clean      # Remove old containers
npm run docker:start      # Start fresh
```

### "Need more help?"
- Check DOCKER_SETUP.md for detailed troubleshooting
- Check DOCKER.md for complete reference
- Check docker-compose.yml for service configuration

---

## 📋 Available Commands

```bash
# Development
npm run dev               # Backend + Frontend (both local)
npm run dev:backend       # Backend only
npm run dev:frontend      # Frontend only

# Docker
npm run docker:start      # Start services (recommended)
npm run docker:stop       # Stop services
npm run docker:logs       # View all logs
npm run docker:status     # Check health
npm run docker:rebuild    # Rebuild images
npm run docker:clean      # Remove all data

# Building
npm run build             # Build backend
```

---

## 🌐 Access Points

| Service | URL | When Running |
|---------|-----|--------------|
| Frontend | http://localhost:3001 | docker:start + dev:frontend |
| Backend API | http://localhost:3000 | docker:start |
| PostgreSQL | localhost:5432 | docker:start |
| Redis | localhost:6379 | docker:start |

---

## 🔑 Environment

Your environment is automatically configured:

**Database:**
- Host: localhost (Docker)
- User: postgres
- Password: postgres
- Database: github_tracker

**Redis:**
- Host: localhost
- Port: 6379

**GitHub:**
- Currently using placeholders
- Add real credentials in .env when needed

---

## 🎓 Learning Path

### Phase 3 Implementation (Plans 03-03 to 03-07)
1. Study the dashboard components in `frontend/components/`
2. Look at how FilterPanel uses useFilterParams hook
3. Build organization overview page (Plan 03-03)
4. Build repository pages (Plan 03-04)
5. Build leaderboard (Plan 03-05)
6. Build PR explorer (Plan 03-06)
7. Build developer detail (Plan 03-07)

### Backend Integration
- Study API endpoints in `docs/API.md`
- Test endpoints at http://localhost:3000
- See how frontend calls APIs via `frontend/lib/api-client.ts`

---

## 🚀 Next Steps

1. **Start Docker:** `npm run docker:start`
2. **Start Frontend:** `npm run dev:frontend`
3. **Open Browser:** http://localhost:3001
4. **Start Building!** Pick a plan and implement it

---

## 📞 Need Help?

- 📖 **Docker questions?** → Read DOCKER_SETUP.md
- 🔍 **Can't find something?** → Check DOCKER.md
- 📋 **Quick reference?** → DOCKER_QUICK_REFERENCE.md
- 🎯 **Project roadmap?** → .planning/ROADMAP.md
- 📋 **All requirements?** → SPEC.md

---

## ✨ You're Ready!

Everything is set up. You have:
- ✅ Full Next.js 15 frontend
- ✅ Docker for all services
- ✅ Hot reload for development
- ✅ Complete documentation
- ✅ Helper scripts

**Go build something amazing!** 🚀

---

*Last updated: 2026-03-28*
*Phase 3: Core Dashboard & Analytics Views*
