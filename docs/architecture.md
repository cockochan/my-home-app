# Architecture Overview

This application is a simple full-stack deployment for a Raspberry Pi home environment.

## Components
- Frontend: React single-page application served by Nginx
- Backend: Node.js/Express API for application data and health checks
- Database: PostgreSQL for future persistence and stateful services

## Runtime flow
1. The browser loads the frontend from the React app container.
2. The frontend calls the backend API over HTTP.
3. The backend can use PostgreSQL for persistence in later iterations.
4. Kubernetes exposes the frontend and backend through Services and optional Ingress.

## Deployment targets
- Local development: Docker Compose
- Kubernetes: Helm chart under helm/my-home-app
- CI/CD: GitHub Actions building and pushing images to GHCR
