# Деплой Maivy Bot

## Рекомендуемый способ: self-hosted Docker

**Без `npx convex login`.** Всё на вашем сервере: PostgreSQL, Convex, админка, бот.

```bash
cp .env.example .env
./scripts/setup-self-hosted.sh
```

Подробно: **[docs/DOCKER.md](DOCKER.md)**

---

## Альтернатива: Convex Cloud

Проект состоит из **трёх частей**, которые деплоятся отдельно:

| Компонент | Где хостится | Команда |
|-----------|--------------|---------|
| **Convex** (бэкенд + админ API) | [Convex Cloud](https://convex.dev) | `npm run deploy:convex` |
| **Админ-панель** (React) | Convex Hosting (вместе с deploy) | та же команда |
| **Бот** (Telegram + MAX) | VPS / Docker / Railway / Fly.io | Docker или `npm start` |

---

## 1. Подготовка

```bash
npm run install:all
cp .env.example .env
cp admin/.env.example admin/.env.local   # только для локальной разработки
```

Проверка перед деплоем:

```bash
npm run predeploy
```

---

## 2. Convex + админ-панель

### Первый деплой

1. Войдите в Convex (если ещё не):

   ```bash
   npx convex login
   ```

2. Задеплойте бэкенд и соберите админ-панель с production URL:

   ```bash
   npm run deploy:convex
   ```

   CLI соберёт `admin/` и подставит production `VITE_CONVEX_URL`.

3. В [Convex Dashboard](https://dashboard.convex.dev) → **Settings → Environment Variables** задайте:

   | Переменная | Значение |
   |------------|----------|
   | `ADMIN_PASSWORD` | Надёжный пароль для входа в админку |
   | `BOT_API_SECRET` | Случайная строка (мин. 32 символа) |

4. Откройте URL админ-панели из вывода `deploy:convex` (Convex Hosting).

5. Войдите в админку → **Боты** → «Создать Maivy по умолчанию».

6. В **Настройки** укажите токены Telegram/MAX, ссылки и пути к медиа.

### CI/CD (GitHub Actions)

В secrets репозитория добавьте `CONVEX_DEPLOY_KEY` (Dashboard → Settings → Deploy Key).

Workflow `.github/workflows/deploy.yml` деплоит Convex при push в `main`.

---

## 3. Бот (production-сервер)

На сервере бота нужны **только 3 переменные** в `.env`:

```env
CONVEX_URL=https://YOUR-DEPLOYMENT.convex.cloud
BOT_API_SECRET=тот-же-секрет-что-в-convex
BOT_SLUG=maivy
```

Все токены и контент — в админ-панели.

### Вариант A: Docker (рекомендуется)

```bash
# На сервере
cp .env.example .env
# заполните CONVEX_URL, BOT_API_SECRET, BOT_SLUG

# Положите медиа в assets/ или смонтируйте volume
docker compose up -d --build
```

Обновление:

```bash
git pull
docker compose up -d --build
```

### Вариант B: Node.js без Docker

```bash
npm run install:all
npm run build
# .env на сервере
npm start
```

Рекомендуется process manager (systemd, pm2):

```ini
# /etc/systemd/system/maivy-bot.service
[Unit]
Description=Maivy Bot
After=network.target

[Service]
Type=simple
User=maivy
WorkingDirectory=/opt/maivy_bot
EnvironmentFile=/opt/maivy_bot/.env
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### Медиафайлы

| Файл | Путь на сервере |
|------|-----------------|
| Фото профиля | `assets/welcome.jpg` |
| Видео-кружочек | `assets/welcome-video.mp4` |

В Docker они монтируются через `docker-compose.yml` (`./assets:/app/assets:ro`).

После первой загрузки в Telegram можно сохранить `telegramVideoNoteFileId` в админке — тогда файл на диске не обязателен.

---

## 4. Чеклист перед запуском

- [ ] `npm run predeploy` проходит без ошибок
- [ ] Convex задеплоен, env vars заданы
- [ ] Админ-панель открывается, бот создан и включён
- [ ] Токены Telegram/MAX заданы в **Настройки**
- [ ] `BOT_API_SECRET` совпадает в Convex и на сервере бота
- [ ] `BOT_SLUG` совпадает с slug в админке
- [ ] Медиафайлы на месте (или `telegramVideoNoteFileId` задан)
- [ ] URL политики ПДн указан и доступен по HTTPS
- [ ] Бот запущен и отвечает на `/start`

---

## 5. Обновление

```bash
# Convex + админка
npm run deploy:convex

# Бот (Docker)
docker compose up -d --build

# Бот (Node)
npm run build && sudo systemctl restart maivy-bot
```

Конфигурация бота подтягивается из Convex каждые 60 секунд — перезапуск нужен только при обновлении кода.

---

## 6. Переменные окружения

### Convex Dashboard

| Переменная | Обязательна | Описание |
|------------|-------------|----------|
| `ADMIN_PASSWORD` | да | Пароль админ-панели |
| `BOT_API_SECRET` | да | Секрет API бота |

### Сервер бота (`.env`)

| Переменная | Обязательна | Описание |
|------------|-------------|----------|
| `CONVEX_URL` | да | URL production Convex |
| `BOT_API_SECRET` | да | Тот же секрет, что в Convex |
| `BOT_SLUG` | да | Slug бота из админки (по умолчанию `maivy`) |

### Локальная разработка админки (`admin/.env.local`)

| Переменная | Описание |
|------------|----------|
| `VITE_CONVEX_URL` | URL dev-деплоя Convex |

---

## 7. Troubleshooting

**Бот не стартует: «Настройте CONVEX_URL и BOT_API_SECRET»**  
Проверьте `.env` на сервере бота.

**Бот не стартует: «не найден или отключён»**  
Создайте бота в админке, проверьте `BOT_SLUG`.

**Telegram/MAX: «токен не задан»**  
Токены задаются в админке → **Настройки**, не в `.env` бота.

**Convex недоступен**  
Бот использует fallback из `src/core/content.ts`, но без связи с Convex аналитика и динамический контент не работают.

**MAX в production**

По [документации MAX](https://dev.max.ru/docs-api) для production нужен **Webhook** (Long Polling только для разработки). Задайте в `.env` на сервере бота:

```env
MAX_WEBHOOK_URL=https://ваш-домен/max/webhook
MAX_WEBHOOK_SECRET=случайная_строка_5_символов
MAX_WEBHOOK_PORT=3000
```

Nginx проксирует HTTPS:443 → `MAX_WEBHOOK_PORT`. Без `MAX_WEBHOOK_URL` бот использует Long Polling и снимает старые webhook-подписки (режим разработки).
