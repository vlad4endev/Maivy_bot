#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

random_hex() {
  openssl rand -hex 32
}

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker не установлен: https://docs.docker.com/get-docker/"
  exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "openssl не найден (нужен для генерации секретов)"
  exit 1
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Создан .env из .env.example"
fi

# shellcheck disable=SC1091
set -a
source .env
set +a

set_env_if_empty() {
  local key="$1"
  local value="$2"
  if ! grep -q "^${key}=" .env || grep -q "^${key}=$" .env; then
    if grep -q "^${key}=" .env; then
      sed -i.bak "s|^${key}=.*|${key}=${value}|" .env && rm -f .env.bak
    else
      echo "${key}=${value}" >> .env
    fi
    echo "Сгенерирован ${key}"
  fi
}

set_env_if_empty "POSTGRES_PASSWORD" "$(random_hex)"
set_env_if_empty "INSTANCE_SECRET" "$(random_hex)"
set_env_if_empty "BOT_API_SECRET" "$(random_hex)"
set_env_if_empty "ADMIN_PASSWORD" "$(random_hex | cut -c1-24)"

# shellcheck disable=SC1091
set -a
source .env
set +a

if [[ "${PUBLIC_CONVEX_URL:-}" == *"YOUR_SERVER_IP"* ]]; then
  echo ""
  echo "Внимание: замените YOUR_SERVER_IP в .env на IP или домен сервера:"
  echo "  PUBLIC_CONVEX_URL=http://<ваш-ip>:3210"
  echo "  PUBLIC_CONVEX_SITE_URL=http://<ваш-ip>:3211"
  echo ""
  read -r -p "Продолжить с localhost? [y/N] " answer
  if [[ "$answer" == "y" || "$answer" == "Y" ]]; then
    sed -i.bak 's|YOUR_SERVER_IP|127.0.0.1|g' .env && rm -f .env.bak
    # shellcheck disable=SC1091
    set -a && source .env && set +a
  else
    exit 1
  fi
fi

echo "Запуск PostgreSQL и Convex backend..."
docker compose up -d postgres convex-backend

echo "Ожидание готовности Convex..."
for _ in $(seq 1 60); do
  if docker compose exec -T convex-backend curl -sf http://localhost:3210/version >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

if [[ -z "${CONVEX_ADMIN_KEY:-}" ]]; then
  echo "Генерация CONVEX_ADMIN_KEY..."
  ADMIN_KEY="$(docker compose exec -T convex-backend ./generate_admin_key.sh | tr -d '\r\n')"
  if grep -q "^CONVEX_ADMIN_KEY=" .env; then
    sed -i.bak "s|^CONVEX_ADMIN_KEY=.*|CONVEX_ADMIN_KEY=${ADMIN_KEY}|" .env && rm -f .env.bak
  else
    echo "CONVEX_ADMIN_KEY=${ADMIN_KEY}" >> .env
  fi
  echo "CONVEX_ADMIN_KEY сохранён в .env"
  # shellcheck disable=SC1091
  set -a && source .env && set +a
fi

echo "Сборка и запуск всех сервисов..."
docker compose up -d --build

echo ""
docker compose ps
echo ""
ADMIN_HOST="$(echo "${PUBLIC_CONVEX_URL}" | sed 's|:3210||' | sed 's|http://||' | sed 's|https://||')"
echo "Админ-панель: http://${ADMIN_HOST}:${ADMIN_PORT:-8080}"
echo "Пароль админки: см. ADMIN_PASSWORD в .env"
echo ""
echo "Логи:  docker compose logs -f"
echo "Стоп:  docker compose down"
