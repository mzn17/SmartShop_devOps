#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:5000/api/health}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
ATTEMPTS="${ATTEMPTS:-24}"

for i in $(seq 1 "$ATTEMPTS"); do
  if curl -fsS "$API_URL" >/dev/null 2>&1; then
    echo "[OK] API saine : $API_URL"
    if curl -fsS "$FRONTEND_URL" >/dev/null 2>&1; then
      echo "[OK] Frontend sain : $FRONTEND_URL"
      exit 0
    fi
    echo "[..] API OK, frontend pas encore prêt ($i/$ATTEMPTS)"
  else
    echo "[..] en attente de l'API ($i/$ATTEMPTS)"
  fi
  sleep 5
done

echo "[ECHEC] environnement non sain après $((ATTEMPTS * 5))s" >&2
exit 1
