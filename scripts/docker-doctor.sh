#!/usr/bin/env bash
# Диагностика на сервере без npm на хосте — только Docker.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose)
if [[ -f docker-compose.cloud.yml ]] && [[ ! -f docker-compose.yml ]]; then
  COMPOSE=(docker compose -f docker-compose.cloud.yml)
fi

echo "Maivy Bot — диагностика (Docker)"
echo "Каталог: $ROOT"
echo ""

if ! command -v docker >/dev/null 2>&1; then
  echo "✗ Docker не установлен"
  exit 1
fi

echo "--- Контейнеры ---"
"${COMPOSE[@]}" ps
echo ""

echo "--- Логи бота (последние 40 строк) ---"
"${COMPOSE[@]}" logs bot --tail 40 2>&1 || echo "(контейнер bot ещё не запускался)"
echo ""

echo "--- Токены в Convex ---"
if "${COMPOSE[@]}" ps --status running --services 2>/dev/null | grep -qx bot; then
  if "${COMPOSE[@]}" exec -T bot test -f scripts/check-tokens.mjs 2>/dev/null; then
    "${COMPOSE[@]}" exec -T bot node scripts/check-tokens.mjs || true
  else
    echo "ℹ Обновите образ бота (git pull && docker compose up -d --build bot)"
    echo "  Затем снова: ./scripts/docker-doctor.sh"
    echo ""
    echo "  Или вручную (docker compose подставит .env сам, source .env не нужен):"
    echo '  docker compose run --rm --no-deps --entrypoint sh convex-deploy -c '"'"'npx convex run botApi:getBotContent "{\"secret\":\"$BOT_API_SECRET\",\"botSlug\":\"maivy\"}"'"'"''
  fi
else
  echo "✗ Контейнер bot не запущен — сначала: docker compose up -d bot"
fi

echo ""
echo "Если токенов нет: админка → Настройки → Платформы → сохранить → docker compose up -d --build bot"
