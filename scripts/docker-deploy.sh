#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MODE="${1:-self-hosted}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker не установлен."
  echo "https://docs.docker.com/get-docker/"
  exit 1
fi

case "$MODE" in
  self-hosted|full|"")
    exec "$ROOT/scripts/setup-self-hosted.sh"
    ;;
  cloud)
    if [[ ! -f .env ]]; then
      echo "Создайте .env с CONVEX_URL, BOT_API_SECRET, BOT_SLUG"
      echo "  cp .env.example .env"
      exit 1
    fi
    echo "Запуск только бота (облачный Convex)..."
    docker compose -f docker-compose.cloud.yml up -d --build
    ;;
  *)
    echo "Использование: $0 [self-hosted|cloud]"
    exit 1
    ;;
esac

echo ""
docker compose ps 2>/dev/null || docker compose -f docker-compose.cloud.yml ps
echo ""
echo "Логи: docker compose logs -f"
