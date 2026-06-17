#!/bin/bash
# Hostinger VPS — one-shot deploy (run in Docker Manager → Terminal)
set -euo pipefail

REPO_DIR="${REPO_DIR:-/root/tradehook}"
REPO_URL="https://github.com/atillakesicioglu/tradehook.git"

if [ ! -d "$REPO_DIR/.git" ]; then
  git clone "$REPO_URL" "$REPO_DIR"
fi

cd "$REPO_DIR"
git pull origin main

if [ ! -f .env ]; then
  cp .env.production.example .env
  echo ""
  echo ">>> .env oluşturuldu. ENCRYPTION_KEY, POSTGRES_PASSWORD ve JWT_SECRET doldur:"
  echo "    nano .env"
  echo ">>> Sonra tekrar çalıştır: bash deploy/hostinger-setup.sh"
  exit 1
fi

# Required secrets
if ! grep -q '^ENCRYPTION_KEY=.\{64\}' .env; then
  echo "HATA: .env içinde ENCRYPTION_KEY (64 hex) eksik."
  exit 1
fi

docker compose -f docker-compose.yml up -d --build

echo ""
echo "Deploy tamam. Kontrol:"
docker compose -f docker-compose.yml ps
echo ""
echo "Panel:  https://atikaiagents.cloud"
echo "API:    https://api.atikaiagents.cloud"
