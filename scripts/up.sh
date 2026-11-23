#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

command -v docker >/dev/null 2>&1 || {
  echo "[ERREUR] Docker est requis." >&2
  exit 1
}

echo "[..] installation et construction du frontend"
npm ci --prefix frontend
VITE_API_URL=/api npm run build --prefix frontend

echo "[..] démarrage de la pile (build de l'image API)"
docker compose up -d --build

./scripts/wait-healthy.sh

echo ""
echo "[OK] SmartShop démarré :"
echo "     Frontend : http://localhost:3000"
echo "     API      : http://localhost:5000/api/health"
