# ImagePress (Frontend + Backend)

## Quick Start (Local)

### Backend (FastAPI)
- Windows: run `start_backend.bat`
- Manual:
  - `cd backend`
  - Activate venv + install: `pip install -r requirements.txt`
  - Run: `uvicorn main:app --reload --host 0.0.0.0 --port 8000`
  - Health check: `http://localhost:8000/api/health`

### Frontend (React + Vite)
- Windows: run `start_frontend.bat`
- Manual:
  - `cd frontend`
  - `npm ci`
  - `npm run dev` (default: `http://localhost:5173`)

## Deploy (Frontend + Backend)

### Option A: Docker Compose (Recommended)
From the repo root:
- Build + start: `docker compose up -d --build`
- App: `http://SERVER_IP/`
- API (direct): `http://SERVER_IP:8000/api/health`
- API (via frontend / reverse proxy): `http://SERVER_IP/api/health`

Notes:
- The frontend container (Nginx) proxies `/api/*` to the backend container (`deploy/nginx-frontend.conf`).
- If you don’t want the backend publicly exposed, remove the `8000:8000` port mapping in `docker-compose.yml`.

### Option B: Linux VPS (systemd + Nginx)
Use the installer script (Ubuntu/Debian):
- HTTP only: `sudo bash deploy/deploy-linux.sh`
- With domain + SSL (Let’s Encrypt): `sudo bash deploy/deploy-linux.sh yourdomain.com`

## Full Deployment Guide
See `DEPLOYMENT.md` for detailed instructions (Docker, VPS, Windows Server, cloud platforms, SSL, and troubleshooting).

## Windows note (Vite/esbuild)
If `npm run build` fails with `Error: spawn EPERM`, move the project out of OneDrive/controlled folders (e.g., `C:\\tool\\imagepress`) or build on Linux/WSL/Docker.
