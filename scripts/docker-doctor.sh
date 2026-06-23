#!/usr/bin/env bash
# Диагностика на сервере без npm на хосте — только Docker.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose)
if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx maivy-convex; then
  if [[ -f docker-compose.yml ]]; then
    COMPOSE=(docker compose -f docker-compose.yml)
  fi
elif [[ -f docker-compose.cloud.yml ]] && [[ ! -f docker-compose.yml ]]; then
  COMPOSE=(docker compose -f docker-compose.cloud.yml)
fi

echo "Maivy Bot — диагностика (Docker)"
echo "Каталог: $ROOT"
echo ""

if [[ ! -f scripts/docker-doctor.sh ]] || [[ ! -f scripts/check-tokens.mjs ]]; then
  echo "✗ Скрипты диагностики не найдены — обновите код:"
  echo "  cd $ROOT && git pull"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "✗ Docker не установлен"
  exit 1
fi

echo "--- Контейнеры ---"
"${COMPOSE[@]}" ps
echo ""

if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx maivy-convex; then
  echo "ℹ Обнаружен self-hosted Convex (maivy-convex)."
  echo "  Запускайте бота так: docker compose up -d --build bot"
  echo "  (не docker-compose.cloud.yml — иначе нет CONVEX_URL=http://convex-backend:3210)"
  echo ""
fi

echo "--- Переменные окружения в контейнере bot ---"
if "${COMPOSE[@]}" ps --status running --services 2>/dev/null | grep -qx bot; then
  for key in CONVEX_URL BOT_API_SECRET BOT_SLUG WEBHOOK_PORT; do
    value="$("${COMPOSE[@]}" exec -T bot printenv "$key" 2>/dev/null || true)"
    if [[ -n "$value" ]]; then
      if [[ "$key" == *SECRET* ]] || [[ "$key" == *TOKEN* ]]; then
        echo "✓ $key задан"
      else
        echo "✓ $key=$value"
      fi
    else
      echo "✗ $key не задан в контейнере"
    fi
  done
else
  echo "(контейнер bot не запущен)"
fi
echo ""

echo "--- Логи бота (последние 40 строк) ---"
"${COMPOSE[@]}" logs bot --tail 40 2>&1 || echo "(контейнер bot ещё не запускался)"
echo ""

BOT_STATUS="$("${COMPOSE[@]}" ps bot --format '{{.State}}' 2>/dev/null | head -1 || true)"
if [[ "$BOT_STATUS" == "restarting" ]] || [[ "$BOT_STATUS" == "exited" ]]; then
  echo "⚠ Контейнер bot: $BOT_STATUS"
  if ! "${COMPOSE[@]}" exec -T bot printenv CONVEX_URL >/dev/null 2>&1; then
    echo "  Причина: нет CONVEX_URL / BOT_API_SECRET в контейнере."
    echo "  Self-hosted: docker compose up -d --build bot"
    echo "  Проверьте .env: BOT_API_SECRET=..."
  else
    echo "  Частая причина: нет токенов Telegram/MAX."
    echo "  Админка → Настройки → сохраните токены → docker compose up -d --build bot"
  fi
  echo ""
fi

run_in_bot() {
  local script="$1"
  if "${COMPOSE[@]}" ps --status running --services 2>/dev/null | grep -qx bot; then
    "${COMPOSE[@]}" exec -T bot test -f "$script"
  else
    return 1
  fi
}

echo "--- Токены в Convex ---"
if run_in_bot scripts/check-tokens.mjs; then
  "${COMPOSE[@]}" exec -T bot node scripts/check-tokens.mjs || true
else
  echo "ℹ Обновите образ бота:"
  echo "  git pull && docker compose up -d --build bot"
  echo "  ./scripts/docker-doctor.sh"
fi

echo ""
echo "--- Кнопки и переходы ---"
if run_in_bot scripts/check-keyboards.mjs; then
  "${COMPOSE[@]}" exec -T bot node scripts/check-keyboards.mjs || true
elif [[ -f scripts/check-keyboards.mjs ]]; then
  echo "ℹ check-keyboards есть в репозитории, но не в контейнере — пересоберите bot:"
  echo "  git pull && docker compose up -d --build bot"
else
  echo "ℹ git pull — скрипт check-keyboards появится после обновления"
fi

echo ""
echo "Если токенов нет: админка → Настройки → Платформы → сохранить → docker compose up -d --build bot"
