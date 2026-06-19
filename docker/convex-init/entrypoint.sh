#!/bin/sh
set -eu

BACKEND_URL="${CONVEX_SELF_HOSTED_URL:-http://convex-backend:3210}"

echo "Ожидание Convex backend (${BACKEND_URL})..."
until wget -q -O- "${BACKEND_URL}/version" >/dev/null 2>&1; do
  sleep 2
done

if [ -z "${CONVEX_SELF_HOSTED_ADMIN_KEY:-}" ]; then
  echo "Ошибка: задайте CONVEX_ADMIN_KEY в .env"
  echo "Получить ключ: docker compose exec convex-backend ./generate_admin_key.sh"
  exit 1
fi

export CONVEX_SELF_HOSTED_URL="${BACKEND_URL}"
export CONVEX_SELF_HOSTED_ADMIN_KEY="${CONVEX_SELF_HOSTED_ADMIN_KEY}"

echo "Деплой функций Convex (self-hosted, без login)..."
npx convex deploy

if [ -n "${ADMIN_PASSWORD:-}" ]; then
  echo "Настройка ADMIN_PASSWORD..."
  npx convex env set ADMIN_PASSWORD "${ADMIN_PASSWORD}"
fi

if [ -n "${BOT_API_SECRET:-}" ]; then
  echo "Настройка BOT_API_SECRET..."
  npx convex env set BOT_API_SECRET "${BOT_API_SECRET}"
fi

if [ -n "${ADMIN_PASSWORD:-}" ]; then
  echo "Создание бота по умолчанию (если ещё нет)..."
  LOGIN_JSON="$(npx convex run adminAuth:login "{\"password\":\"${ADMIN_PASSWORD}\"}")"
  ADMIN_TOKEN="$(node -e "const r=JSON.parse(process.argv[1]); process.stdout.write(r.token)" "${LOGIN_JSON}")"
  if npx convex run seed:seedDefaultBot "{\"token\":\"${ADMIN_TOKEN}\"}" 2>/dev/null; then
    echo "Бот maivy создан."
  else
    echo "Бот maivy уже существует — пропуск seed."
  fi
fi

echo "Convex init завершён."
