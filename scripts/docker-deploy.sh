#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MODE="${1:-prod}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker не установлен."
  echo "Установите Docker Desktop: https://docs.docker.com/get-docker/"
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "Файл .env не найден."
  echo "Скопируйте шаблон и заполните переменные:"
  echo "  cp .env.example .env"
  exit 1
fi

# shellcheck disable=SC1091
source .env 2>/dev/null || true

if [[ "$MODE" == "dev" ]]; then
  echo "Запуск бота в Docker (режим dev → convex dev на хосте)..."
  docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
else
  if [[ -z "${CONVEX_URL:-}" ]]; then
    echo "Ошибка: CONVEX_URL не задан в .env"
    exit 1
  fi
  if [[ "$CONVEX_URL" == http://127.0.0.1:* ]] || [[ "$CONVEX_URL" == http://localhost:* ]]; then
    echo "Предупреждение: CONVEX_URL указывает на localhost."
    echo "Для production используйте URL из Convex Dashboard (https://....convex.cloud)."
    echo "Для локальной разработки запустите: ./scripts/docker-deploy.sh dev"
  fi
  if [[ -z "${BOT_API_SECRET:-}" ]]; then
    echo "Ошибка: BOT_API_SECRET не задан в .env"
    exit 1
  fi
  echo "Запуск бота в Docker (production)..."
  docker compose up -d --build
fi

echo ""
docker compose ps
echo ""
echo "Логи: docker compose logs -f bot"
echo "Стоп:  docker compose down"
