#!/usr/bin/env bash
# Безопасное обновление на сервере: stash локальных правок → pull → rebuild.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose)
if [[ -f docker-compose.cloud.yml ]] && [[ ! -f docker-compose.yml ]]; then
  COMPOSE=(docker compose -f docker-compose.cloud.yml)
fi

echo "Maivy Bot — обновление с GitHub"
echo "Каталог: $ROOT"
echo ""

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "✗ Это не git-репозиторий"
  exit 1
fi

STASHED=0
if ! git diff --quiet docker-compose.yml 2>/dev/null || ! git diff --cached --quiet docker-compose.yml 2>/dev/null; then
  echo "→ Сохраняю локальные правки docker-compose.yml во временный stash..."
  git stash push -m "server-update $(date +%F)" -- docker-compose.yml
  STASHED=1
fi

echo "→ git pull"
if ! git pull --ff-only; then
  echo ""
  echo "✗ git pull не удался. Если конфликт — выполните:"
  echo "  git status"
  echo "  git stash list"
  exit 1
fi

if [[ "$STASHED" -eq 1 ]]; then
  echo "→ Возвращаю локальные правки docker-compose.yml..."
  if ! git stash pop; then
    echo ""
    echo "⚠ Конфликт в docker-compose.yml — откройте файл и объедините вручную."
    echo "  Резервная копия: git show stash@{0}:docker-compose.yml"
    exit 1
  fi
fi

echo "→ Пересборка bot (без кэша исходников)..."
"${COMPOSE[@]}" build --no-cache bot
"${COMPOSE[@]}" up -d bot

echo ""
if [[ -x scripts/docker-doctor.sh ]]; then
  ./scripts/docker-doctor.sh
else
  echo "✓ Обновлено до $(git log -1 --oneline)"
  echo "  Запустите: ./scripts/docker-doctor.sh"
fi
