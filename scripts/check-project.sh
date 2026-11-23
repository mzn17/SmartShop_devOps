#!/usr/bin/env bash
set -u
# Pas de "set -e" : on veut compter toutes les erreurs.

errors=0
required=(
  README.md
  .gitignore
  database/MONGODB.md
  backend/package.json
  backend/package-lock.json
  backend/server.js
  backend/.env.example
  frontend/package.json
  frontend/package-lock.json
  frontend/index.html
  frontend/vite.config.js
  # backend/Dockerfile          (étape 3)
  # backend/.dockerignore       (étape 3)
  # compose.yaml                (étape 4)
  # frontend/nginx.conf         (étape 4)
  # .github/workflows/ci.yml    (étape 5)
)

echo "[CHECK] SmartShop"

for file in "${required[@]}"; do
  if [[ -f "$file" ]]; then
    echo "[OK] $file"
  else
    echo "[ERREUR] fichier absent: $file" >&2
    errors=$((errors + 1))
  fi
done

if git ls-files | grep -Eq '(^|/)\.env$'; then
  echo "[ERREUR] un fichier .env est suivi par Git" >&2
  errors=$((errors + 1))
else
  echo "[OK] aucun .env suivi"
fi

if [[ $errors -gt 0 ]]; then
  echo "[ECHEC] $errors erreur(s)" >&2
  exit 1
fi

echo "[SUCCES] contrôles validés"
exit 0
