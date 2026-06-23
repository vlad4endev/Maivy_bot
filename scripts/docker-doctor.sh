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

echo "--- Логи бота (последние 40 строк) ---"
"${COMPOSE[@]}" logs bot --tail 40 2>&1 || echo "(контейнер bot ещё не запускался)"
echo ""

BOT_STATUS="$("${COMPOSE[@]}" ps bot --format '{{.State}}' 2>/dev/null | head -1 || true)"
if [[ "$BOT_STATUS" == "restarting" ]] || [[ "$BOT_STATUS" == "exited" ]]; then
  echo "⚠ Контейнер bot: $BOT_STATUS — частая причина: нет токенов Telegram/MAX."
  echo "  Админка → Настройки → сохраните токены → docker compose up -d --build bot"
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
