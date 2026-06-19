# Развёртывание Maivy Bot — полностью в Docker (без `npx convex login`)

Весь стек работает на вашем сервере: **PostgreSQL**, **Convex (self-hosted)**, **админ-панель**, **бот**.

`npx convex login` **не нужен** — ни на сервере, ни для работы бота.

---

## Архитектура

```
┌─────────────── Docker на вашем VPS ───────────────────────────────┐
│                                                                    │
│  postgres ──► convex-backend ──► convex-deploy (один раз при up)  │
│                      │                    │                        │
│                      ├────────────────────┼──► bot (Telegram/MAX)  │
│                      │                    │                        │
│                      └────────────────────┴──► admin (nginx :8080) │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

| Сервис | Порт | Назначение |
|--------|------|------------|
| `postgres` | внутренний | База данных |
| `convex-backend` | 3210, 3211 | API + backend |
| `admin` | 8080 | Админ-панель |
| `bot` | — | Telegram + MAX |

---

## Быстрый старт на сервере

```bash
git clone https://github.com/vlad4endev/Maivy_bot.git
cd Maivy_bot

cp .env.example .env
# Отредактируйте PUBLIC_CONVEX_URL — укажите IP или домен сервера

chmod +x scripts/setup-self-hosted.sh
./scripts/setup-self-hosted.sh
```

Скрипт сам:
1. Сгенерирует секреты (`POSTGRES_PASSWORD`, `INSTANCE_SECRET`, …)
2. Поднимет PostgreSQL и Convex
3. Создаст `CONVEX_ADMIN_KEY` (аналог login, но локально в Docker)
4. Задеплоит функции Convex
5. Запустит админку и бота

---

## Настройка `.env`

```env
# Публичный адрес — браузер пользователя должен достучаться до Convex
PUBLIC_CONVEX_URL=http://203.0.113.10:3210
PUBLIC_CONVEX_SITE_URL=http://203.0.113.10:3211

ADMIN_PORT=8080
BOT_SLUG=maivy

# Секреты (setup-self-hosted.sh сгенерирует автоматически)
POSTGRES_PASSWORD=...
INSTANCE_SECRET=...
CONVEX_ADMIN_KEY=...
ADMIN_PASSWORD=...
BOT_API_SECRET=...
```

**Важно:** `PUBLIC_CONVEX_URL` — это адрес, который видит **браузер** при открытии админки. Укажите внешний IP или домен сервера, не `localhost`.

---

## После первого запуска

1. Откройте админку: `http://ВАШ-IP:8080`
2. Войдите с паролем из `ADMIN_PASSWORD` в `.env`
3. **Боты** → «Создать Maivy по умолчанию»
4. **Настройки** → токены Telegram/MAX, ссылки, медиа
5. Положите медиа в `assets/` и перезапустите бота при необходимости

---

## Команды

```bash
# Запуск / обновление
docker compose up -d --build

# Логи
docker compose logs -f bot
docker compose logs -f convex-backend

# Остановка
docker compose down

# Данные PostgreSQL сохраняются в volume postgres_data
```

---

## Обновление кода

```bash
git pull
docker compose up -d --build
```

Сервис `convex-deploy` заново задеплоит функции Convex. Перезапуск бота подхватит новый код.

---

## Облачный Convex (опционально)

Если всё же хотите Convex Cloud вместо self-hosted:

```bash
cp .env.example .env
# CONVEX_URL=https://....convex.cloud
./scripts/docker-deploy.sh cloud
```

Это запускает **только бота** через `docker-compose.cloud.yml`.

---

## Безопасность

- Не коммитьте `.env` в git
- Откройте в firewall только нужные порты: 8080 (админ), 3210 (если админ с другого хоста)
- Для production используйте HTTPS через reverse proxy (nginx/Caddy + Let's Encrypt)
- `BOT_API_SECRET` должен совпадать в Convex env и у бота (настраивается автоматически через `convex-deploy`)

---

## Troubleshooting

**Админка не подключается к Convex**  
Проверьте `PUBLIC_CONVEX_URL` — должен быть доступен из браузера. Пересоберите admin: `docker compose up -d --build admin`.

**`CONVEX_ADMIN_KEY required`**  
Запустите `./scripts/setup-self-hosted.sh` или вручную:
```bash
docker compose exec convex-backend ./generate_admin_key.sh
```

**Бот не находит бота в базе**  
Создайте бота в админке, проверьте `BOT_SLUG`.

**Порты заняты**  
Измените `CONVEX_HTTP_PORT`, `ADMIN_PORT` в `.env`.
