# my-home-app

A small home dashboard app (React frontend + Express backend + Postgres) deployed via Helm to a Raspberry Pi running k3s, exposed to the internet through Tailscale Funnel.

## Stack

- **Frontend:** React (Create React App), served via nginx in production
- **Backend:** Express + `pg` (Postgres client)
- **Database:** Postgres 16
- **Local dev:** Docker Compose
- **Production:** k3s on a Raspberry Pi, deployed via Helm, images hosted on GHCR
- **Public access:** Tailscale Funnel (no port forwarding, no domain needed)

---

## Local Development

### Run everything locally with Docker Compose

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- Postgres: localhost:5432

Stop with `docker compose down`. Add `-d` to run detached.

### Environment files (not committed — see `.gitignore`)

Each service has its own env file since values differ between local dev, Docker Compose, and Kubernetes:

**`backend/.env.backend`** (used outside Docker Compose, e.g. running the backend directly)
```dotenv
DATABASE_URL=postgresql://appuser:apppassword@localhost:5432/myhomeapp
PGSSLMODE=disable
PORT=5000
NODE_ENV=production
```

**`frontend/.env.development`** (used by `npm start`)
```dotenv
REACT_APP_API_URL=http://localhost:5000
```

> Note: Docker Compose does **not** read these files — `docker-compose.yml` hardcodes its own environment values (using the Compose service name `postgres` for `DATABASE_URL`, not `localhost`). These `.env` files are only for running things outside Compose.

> Since these files are gitignored, **losing your local copy means recreating them by hand** — there's no backup in git. Consider keeping a private copy somewhere safe.

---

## CI (GitHub Actions)

`.github/workflows/ci.yml` runs on every push to `main`/`master`:
1. **test job** — installs deps, runs frontend tests
2. **docker job** — builds both images for `linux/arm64` (Pi architecture) and pushes to GHCR, tagged with both the commit SHA and `:latest`

Requires `permissions: packages: write` on the `docker` job — without it, the push fails with a 403.

If the repo is under a GitHub **organization** rather than a personal account, the org's Settings → Actions → **Workflow permissions** must also allow package writes, or pushes fail with `installation not allowed to Write organization package` regardless of the YAML.

Check runs at: `github.com/cockochan/my-home-app/actions`

---

## Deploying to the Raspberry Pi

Images are **not built on the Pi** — it only pulls and runs them (no Docker installed there). CI builds and pushes to GHCR; the Pi just needs to be told to pull.

### 1. Make sure CI succeeded

Check `github.com/cockochan/my-home-app/actions` — the `docker` job should be green after your push. This means fresh `:latest` images are already on GHCR.

### 2. SSH into the Pi and pull the repo (for any Helm chart changes)

```bash
ssh cockochan@blackpie.local
cd ~/my-home-app
git pull
```

### 3. Re-run Helm (safe even if nothing in the chart changed)

```bash
helm upgrade --install my-home-app ./helm/my-home-app \
  --set frontend.image.repository=ghcr.io/cockochan/my-home-app-frontend \
  --set frontend.image.tag=latest \
  --set backend.image.repository=ghcr.io/cockochan/my-home-app-backend \
  --set backend.image.tag=latest
```

### 4. Force pods to pull the new `:latest` image

Since the tag doesn't change between deploys, Kubernetes won't auto-detect a new image was pushed (`imagePullPolicy: IfNotPresent` in `values.yaml`). Delete the pod(s) for whatever changed so they're recreated and re-pull:

```bash
kubectl get pods
kubectl delete pod <frontend-and/or-backend-pod-name>
kubectl get pods -w
```

Ctrl+C once the pod shows `Running` again.

### 5. Verify

Locally on the Pi:
```bash
curl http://127.0.0.1:31754      # frontend NodePort
curl http://127.0.0.1:31817      # backend NodePort
```

Publicly (use an incognito window to rule out browser caching):
- Frontend: https://blackpie.taila33551.ts.net/
- Backend: https://blackpie.taila33551.ts.net:8443/

---

## Manual build/push (fallback if CI is down)

Only needed if you're bypassing CI. Requires Docker Desktop with buildx, run from a machine with Docker (not the Pi):

```bash
docker login ghcr.io -u cockochan
# paste a GitHub classic PAT with write:packages + read:packages scopes as the password
# (this is a GitHub token, NOT a Docker Hub password — ghcr.io authenticates via GitHub)

docker buildx build --platform linux/arm64 \
  --build-arg REACT_APP_API_URL=https://blackpie.taila33551.ts.net:8443 \
  -t ghcr.io/cockochan/my-home-app-frontend:latest \
  --push ./frontend

docker buildx build --platform linux/arm64 \
  -t ghcr.io/cockochan/my-home-app-backend:latest \
  --push ./backend
```

Then continue from step 2 above (SSH in, pull, helm upgrade, delete pod, verify).

---

## Public access via Tailscale Funnel

The Pi exposes two ports publicly through Tailscale (no router config, no domain, free HTTPS):

| Public URL | Proxies to |
|---|---|
| `https://blackpie.taila33551.ts.net/` | `127.0.0.1:31754` (frontend NodePort) |
| `https://blackpie.taila33551.ts.net:8443/` | `127.0.0.1:31817` (backend NodePort) |

### Check current state
```bash
tailscale funnel status
```
Should show both ports listed as `Funnel on`.

### Re-create if a mapping is ever lost or wrong
```bash
tailscale funnel reset
sudo tailscale funnel --bg 31754                    # frontend on default port 443
sudo tailscale funnel --bg --https=8443 31817       # backend on port 8443
```

> `tailscale funnel <target>` takes the **local target** (port/URL), not the public port — the public port is chosen separately via `--https` (defaults to 443). Don't mix this up with `tailscale serve`, which only exposes within your tailnet, not the public internet.

Both `tailscaled` and `k3s` are enabled as systemd services, so these mappings and the cluster itself should survive a Pi reboot automatically. Spot-check after any maintenance:
```bash
systemctl is-enabled tailscaled k3s
tailscale funnel status
kubectl get pods
```

---

## Known gotchas

- **`REACT_APP_API_URL` is baked in at build time**, not read at runtime. Changing `.env.frontend`/`.env.development` alone does nothing to an already-built image — the value must be passed via `--build-arg` (manual) or set in the CI workflow's `build-args` (automated).
- **`:latest` tags don't auto-refresh pods.** Either bump to real version tags per release, or set `imagePullPolicy: Always` in `values.yaml` if you want new pushes to take effect without manually deleting pods.
- **GHCR packages default to private.** If pods show `ImagePullBackOff`/`ErrImagePull` with a 403, check `github.com/cockochan?tab=packages` and either make them public or set up a `kubectl create secret docker-registry` pull secret.
- **Never commit `.env*` files or paste tokens/secrets into chat, docs, or commits.** If a token is ever exposed, revoke it immediately at `github.com/settings/tokens`.
