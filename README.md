my-home-app

A small home dashboard app (React frontend + Express backend + Postgres) deployed via Helm to a Raspberry Pi running k3s, exposed to the internet through Tailscale Funnel.

This file is written as a deploy runbook, not marketing copy. If you're an AI assistant reading this to help with a deploy, the TL;DR below is the fast path — the sections after it have the reasoning/gotchas behind each step.

TL;DR — deploy a change right now
bash
# 1. Commit & push code (Windows machine)
git add .
git commit -m "..."
git push

# 2. Check CI succeeded
# → github.com/cockochan/my-home-app/actions (docker job must be green)

# 3. SSH into the Pi
ssh cockochan@blackpie.local
cd ~/my-home-app
git pull

# 4. Re-run helm (safe no-op if chart unchanged)
helm upgrade --install my-home-app ./helm/my-home-app \
  --set frontend.image.repository=ghcr.io/cockochan/my-home-app-frontend \
  --set frontend.image.tag=latest \
  --set backend.image.repository=ghcr.io/cockochan/my-home-app-backend \
  --set backend.image.tag=latest

# 5. Force pod(s) to re-pull :latest (tag doesn't change, k8s won't auto-detect)
kubectl get pods
kubectl delete pod <changed-service-pod-name>
kubectl get pods -w   # wait for Running, Ctrl+C

# 6. Verify — USE INCOGNITO, CRA caches aggressively
# Frontend: https://blackpie.taila33551.ts.net/
# Backend:  https://blackpie.taila33551.ts.net:8443/

If step 6 shows old content in a normal browser tab but the pod age in step 5 is fresh (kubectl get pods shows recent AGE), it is almost always browser cache, not a bad deploy. Confirm by checking the served bundle directly before assuming the deploy failed:

bash
curl -s http://127.0.0.1:31754/ | grep -o 'main\.[a-z0-9]*\.js'
curl -s http://127.0.0.1:31754/static/js/main.XXXXXXXX.js | grep -o "SomeComponentName"
Stack
Frontend: React (Create React App), served via nginx in production
Backend: Express + pg (Postgres client)
Database: Postgres 16
Local dev: Docker Compose
Production: k3s on a Raspberry Pi, deployed via Helm, images hosted on GHCR
Public access: Tailscale Funnel (no port forwarding, no domain needed)
Current app surface (keep this updated as routes/features are added)
Frontend routes: /, /database, /authentication (placeholder pages as of last update — auth work in progress, not yet wired to a real backend flow)
Backend routes: /health, /api (returns backend status, db status, and app_status rows)
Auth/sign-in: in progress. No finalized flow yet — do not assume JWT/session/OAuth specifics until this section is updated with what was actually built. If working on this with an assistant, paste the current backend auth routes/middleware before asking for help so it isn't guessing at what exists.
Local Development
Run everything locally with Docker Compose
bash
docker compose up --build
Frontend: http://localhost:3000
Backend: http://localhost:5000
Postgres: localhost:5432

Stop with docker compose down. Add -d to run detached.

Environment files (not committed — see .gitignore)

Each service has its own env file since values differ between local dev, Docker Compose, and Kubernetes:

backend/.env.backend (used outside Docker Compose, e.g. running the backend directly)

dotenv
DATABASE_URL=postgresql://appuser:apppassword@localhost:5432/myhomeapp
PGSSLMODE=disable
PORT=5000
NODE_ENV=production

frontend/.env.development (used by npm start)

dotenv
REACT_APP_API_URL=http://localhost:5000

Docker Compose does not read these files — docker-compose.yml hardcodes its own environment values (using the Compose service name postgres for DATABASE_URL, not localhost). These .env files are only for running things outside Compose.

Since these files are gitignored, losing your local copy means recreating them by hand — there's no backup in git. Keep a private copy somewhere safe (password manager note, etc).

CI (GitHub Actions)

.github/workflows/ci.yml runs on every push to main/master:

test job — installs deps, runs frontend tests
docker job — builds both images for linux/arm64 (Pi architecture) and pushes to GHCR, tagged with both the commit SHA and :latest

Requires permissions: packages: write on the docker job — without it, the push fails with a 403. This has silently reverted before (e.g. after a local file loss/redownload) — if pushes start failing with a 403, check this first before assuming credentials are the problem.

If the repo is under a GitHub organization rather than a personal account, the org's Settings → Actions → Workflow permissions must also allow package writes, or pushes fail with installation not allowed to Write organization package regardless of the YAML.

Check runs at: github.com/cockochan/my-home-app/actions

Manual build/push (fallback if CI is down)

Only needed if bypassing CI. Requires Docker Desktop with buildx, run from a machine with Docker (not the Pi):

bash
docker login ghcr.io -u cockochan
# Password prompt wants a GitHub classic PAT (scopes: write:packages, read:packages)
# NOT a Docker Hub password — ghcr.io authenticates via GitHub regardless of the "docker login" command name.
# NEVER paste a real token into a chat/doc — if one is ever exposed, revoke it immediately at github.com/settings/tokens.

docker buildx build --platform linux/arm64 \
  --build-arg REACT_APP_API_URL=https://blackpie.taila33551.ts.net:8443 \
  -t ghcr.io/cockochan/my-home-app-frontend:latest \
  --push ./frontend

docker buildx build --platform linux/arm64 \
  -t ghcr.io/cockochan/my-home-app-backend:latest \
  --push ./backend

Then continue from the TL;DR step 3 (SSH in, pull, helm upgrade, delete pod, verify).

Public access via Tailscale Funnel
Public URL	Proxies to
https://blackpie.taila33551.ts.net/	127.0.0.1:31754 (frontend NodePort)
https://blackpie.taila33551.ts.net:8443/	127.0.0.1:31817 (backend NodePort)
Check current state
bash
tailscale funnel status

Should show both ports listed as Funnel on.

Re-create if a mapping is ever lost or wrong
bash
tailscale funnel reset
sudo tailscale funnel --bg 31754                    # frontend on default port 443
sudo tailscale funnel --bg --https=8443 31817       # backend on port 8443

tailscale funnel <target> takes the local target (port/URL), not the public port — the public port is chosen separately via --https (defaults to 443). Don't confuse with tailscale serve, which only exposes within your tailnet, not the public internet. Running serve alone (without funnel) can silently remove an existing funnel binding — if the public URL suddenly goes 502, check tailscale funnel status before assuming the app broke.

Both tailscaled and k3s are enabled as systemd services, so these mappings and the cluster itself should survive a Pi reboot automatically. Spot-check after any maintenance:

bash
systemctl is-enabled tailscaled k3s
tailscale funnel status
kubectl get pods
Known gotchas
REACT_APP_API_URL is baked in at build time, not read at runtime. Changing .env.frontend/.env.development alone does nothing to an already-built image — the value must be passed via --build-arg (manual) or set in the CI workflow's build-args (automated).
:latest tags don't auto-refresh pods. imagePullPolicy: IfNotPresent in values.yaml means k8s won't re-pull just because a new :latest exists — pod must be manually deleted, or switch to real version tags / imagePullPolicy: Always.
GHCR packages default to private. If pods show ImagePullBackOff/ErrImagePull with a 403, check github.com/cockochan?tab=packages and either make them public or set up a kubectl create secret docker-registry pull secret.
Service type can revert to ClusterIP. If frontend/backend stop being reachable via NodePort after a helm upgrade, check values.yaml — a manual kubectl patch svc ... NodePort doesn't persist across chart re-applies unless it's actually set in values.yaml.
Backend DATABASE_URL differs by environment — must point at the right host per context, don't copy one value into another environment:
Local Compose: postgres (Compose service name)
Local, outside Docker: localhost
Kubernetes: my-home-app-postgres (k8s Service name)
Never commit .env* files or paste tokens/secrets into chat, docs, or commits.