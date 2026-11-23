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
  backend/Dockerfile
  backend/.dockerignore
  backend/test/health.test.js
  frontend/package.json
  frontend/package-lock.json
  frontend/index.html
  frontend/vite.config.js
  frontend/nginx.conf
  compose.yaml
  compose.staging.yaml
  .github/workflows/ci.yml
  scripts/check-project.sh
  scripts/wait-healthy.sh
  scripts/deploy.sh
  scripts/rollback.sh
  scripts/up.sh
  .env.deploy.example
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

# Aucun secret ni fichier d'environnement réel ne doit être suivi par Git.
if git ls-files | grep -Eq '(^|/)\.env(\.deploy)?$'; then
  echo "[ERREUR] un fichier .env ou .env.deploy est suivi par Git" >&2
  errors=$((errors + 1))
else
  echo "[OK] aucun .env / .env.deploy suivi"
fi

# Les dépendances et le build frontend ne doivent pas être versionnés.
if git ls-files | grep -Eq '(^|/)(node_modules|dist)/'; then
  echo "[ERREUR] node_modules/ ou dist/ suivi par Git" >&2
  errors=$((errors + 1))
else
  echo "[OK] ni node_modules/ ni dist/ suivis"
fi

# Le backend doit exposer un script de tests (point 5 du projet).
if grep -q '"test"' backend/package.json; then
  echo "[OK] script npm test présent"
else
  echo "[ERREUR] backend/package.json n'expose pas de script \"test\"" >&2
  errors=$((errors + 1))
fi

if [[ $errors -gt 0 ]]; then
  echo "[ECHEC] $errors erreur(s)" >&2
  exit 1
fi

echo "[SUCCES] contrôles validés"
exit 0
