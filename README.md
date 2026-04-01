# GitHub Tracker

Engineering analytics dashboard for GitHub — PR throughput, review velocity, developer activity.

## Quick Start

### 1. Install Docker Desktop

Download and install from https://www.docker.com/products/docker-desktop/

Make sure it's **running** before proceeding (you should see the Docker icon in your menu bar).

### 2. Clone the project

```bash
git clone git@github.com:fmmalta/github-tracker.git
cd github-tracker
```

### 3. Add the `.env` file

Place the `.env` file you received into the project root folder (the `github-tracker/` directory).

### 4. Start everything

```bash
docker compose up --build
```

Wait for the build to finish. You'll see logs from all services. When you see `Nest application successfully started` and `Ready in`, it's done.

### 5. Open the app

Go to **http://localhost:3001**

Create an account and you're in.

---

## Day-to-day usage

| What you want to do | Command |
|---------------------|---------|
| Start the app | `docker compose up` |
| Start after code changes | `docker compose up --build` |
| Stop the app | `docker compose down` |
| Stop and delete all data | `docker compose down -v` |
| See logs | `docker compose logs -f` |

---

## Troubleshooting

**"Cannot connect to the Docker daemon"**
Open Docker Desktop and wait for it to fully start, then retry.

**"Port already in use"**
```bash
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```
Then run `docker compose up` again.

**"Something is broken"**
Start fresh — this deletes the database and rebuilds everything:
```bash
docker compose down -v
docker compose up --build
```

---

## Access Points

| Service | URL |
|---------|-----|
| App | http://localhost:3001 |
| API | http://localhost:3000 |
| API Docs | http://localhost:3000/api/docs |

---

## For Developers

If you prefer running locally with hot-reload instead of Docker:

**Prerequisites:** Node.js 23+, PostgreSQL on localhost:5432, Redis on localhost:6379

```bash
npm install
cd frontend && npm install && cd ..
npm run dev
```

Backend runs on port 3000, frontend on port 3001.
