#!/usr/bin/env bash
set -euo pipefail
for i in $(seq 1 12); do
  if curl -fsS http://localhost:5000/api/health >/dev/null; then
    echo 'staging sain'
    exit 0
  fi
  sleep 5
done
echo 'staging non sain' >&2
exit 1
