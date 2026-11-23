#!/usr/bin/env bash
# Retour arrière : remet en service une version précédente déjà publiée.
# Le mécanisme : les images sont immuables et taguées vX.Y.Z sur GHCR,
# il suffit donc de changer IMAGE_TAG et de relancer Compose (pas de rebuild).
set -euo pipefail

cd "$(dirname "$0")/.."

TARGET="${1:-}"
if [[ -z "$TARGET" ]]; then
  echo "Usage: scripts/rollback.sh vX.Y.Z" >&2
  echo "Images disponibles : https://github.com/mzn17/SmartShop_devOps/pkgs/container/smartshop-api" >&2
  exit 2
fi

CURRENT="$(cat .deployed-version 2>/dev/null || echo 'inconnue')"
echo "[..] version actuelle : $CURRENT → retour vers : $TARGET"

exec scripts/deploy.sh "$TARGET"
