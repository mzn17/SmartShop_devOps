#!/usr/bin/env bash
# Met en service une version DÉJÀ PUBLIÉE sur GHCR (aucune reconstruction).
set -euo pipefail

cd "$(dirname "$0")/.."

TAG="${1:-}"
if [[ -z "$TAG" ]]; then
  echo "Usage: scripts/deploy.sh vX.Y.Z" >&2
  exit 2
fi

if [[ ! -f .env.deploy ]]; then
  echo "[ERREUR] .env.deploy absent : cp .env.deploy.example .env.deploy" >&2
  exit 1
fi

if ! grep -q '^JWT_SECRET=.' .env.deploy; then
  echo "[ERREUR] JWT_SECRET vide dans .env.deploy" >&2
  exit 1
fi

# Priorité à l'argument : l'image tirée est exactement celle du tag demandé.
export IMAGE_TAG="$TAG"

# .env.deploy n'est pas le .env par défaut de Compose : on le passe explicitement.
COMPOSE=(docker compose --env-file .env.deploy -f compose.staging.yaml)

# Le frontend est servi par Nginx depuis ./frontend/dist (non versionné).
if [[ ! -f frontend/dist/index.html ]]; then
  echo "[..] frontend/dist absent : construction"
  npm ci --prefix frontend
  VITE_API_URL=/api npm run build --prefix frontend
fi

echo "[..] récupération de ghcr.io/mzn17/smartshop-api:$TAG"
"${COMPOSE[@]}" pull

echo "[..] mise en service"
"${COMPOSE[@]}" up -d --remove-orphans

./scripts/wait-healthy.sh

printf '%s\n' "$TAG" > .deployed-version
CID="$("${COMPOSE[@]}" ps -q api)"
VERSION="$(docker inspect --format '{{ index .Config.Labels "version" }}' "$CID")"
echo "[OK] version en service : $TAG (label de l'image : $VERSION)"
