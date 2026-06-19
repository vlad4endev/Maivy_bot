# Развёртывание Maivy Bot через Docker

## Архитектура

Проект состоит из **трёх частей**. В Docker помещается только **бот**:

| Компонент | Где работает | Docker? |
|-----------|--------------|---------|
| **База данных + API** (Convex) | [Convex Cloud](https://convex.dev) | Нет — managed SaaS |
| **Админ-панель** (React) | Convex Hosting | Нет — деплоится вместе с Convex |
| **Бот** (Telegram + MAX) | Ваш VPS / сервер | **Да** |

Convex — это облачная база данных. Её нельзя поднять в отдельном Docker-контейнере на production (как PostgreSQL). Бот в Docker подключается к Convex по HTTPS.

```
┌─────────────────┐     HTTPS      ┌──────────────────────┐
│  Docker: bot    │ ──────────────►│  Convex Cloud        │
│  (Telegram/MAX) │                │  • база данных       │
└─────────────────┘                │  • админ API         │
                                   │  • админ-панель (UI) │
                                   └──────────────────────┘
```

---

## Требования

- [Docker Desktop](https://docs.docker.com/get-docker/) (macOS / Windows) или Docker Engine (Linux)
- Аккаунт [Convex](https://convex.dev)
- Токены Telegram / MAX (задаются в админ-панели)

---

## Шаг 1. Установите Docker

**macOS:**

```bash
brew install --cask docker
# или скачайте Docker Desktop с https://www.docker.com/products/docker-desktop/
open -a Docker
```

Проверка:

```bash
docker --version
docker compose version
```

---

## Шаг 2. Задеплойте базу и админ-панель (Convex)

```bash
npm run install:all
npx convex login
npm run deploy:convex
```

После деплоя скопируйте **production URL** (например `https://happy-animal-123.convex.cloud`).

В [Convex Dashboard](https://dashboard.convex.dev) → **Settings → Environment Variables**:

| Переменная | Значение |
|------------|----------|
| `ADMIN_PASSWORD` | Пароль для админ-панели |
| `BOT_API_SECRET` | Случайная строка (мин. 32 символа) |

Откройте URL админ-панели из вывода `deploy:convex`, войдите и:

1. **Боты** → «Создать Maivy по умолчанию»
2. **Настройки** → укажите токены Telegram/MAX, ссылки, медиа

---

## Шаг 3. Настройте `.env` для Docker

```bash
cp .env.example .env
```

Заполните `.env`:

```env
CONVEX_URL=https://ВАШ-DEPLOYMENT.convex.cloud
BOT_API_SECRET=тот-же-секрет-что-в-convex-dashboard
BOT_SLUG=maivy
```

`BOT_API_SECRET` должен **совпадать** с переменной в Convex Dashboard.

---

## Шаг 4. Медиафайлы

Положите файлы в `assets/` (монтируются в контейнер без пересборки):

| Файл | Назначение |
|------|------------|
| `assets/welcome.jpg` | Фото профиля |
| `assets/welcome-video.mp4` | Видео-кружочек |

---

## Шаг 5. Запуск

```bash
# Вариант A: скрипт
chmod +x scripts/docker-deploy.sh
./scripts/docker-deploy.sh

# Вариант B: npm
npm run docker:up

# Вариант C: напрямую
docker compose up -d --build
```

Проверка:

```bash
docker compose ps
docker compose logs -f bot
```

Бот должен ответить на `/start` в Telegram.

---

## Локальная разработка (бот в Docker + convex dev на хосте)

Если вы запускаете `npx convex dev` на машине, а бот хотите в контейнере:

```bash
# Терминал 1
npx convex dev

# Терминал 2 — .env с BOT_API_SECRET и BOT_SLUG
./scripts/docker-deploy.sh dev
```

Контейнер подключится к `http://host.docker.internal:3210`.

---

## Обновление

```bash
git pull

# Convex + админка
npm run deploy:convex

# Бот
docker compose up -d --build
```

Конфигурация бота подтягивается из Convex каждые 60 секунд — перезапуск нужен только при обновлении **кода** бота.

---

## Полезные команды

```bash
docker compose logs -f bot      # логи
docker compose restart bot      # перезапуск
docker compose down             # остановка
docker compose down -v            # остановка (volumes не используются для данных)
npm run docker:down               # то же через npm
```

---

## Troubleshooting

**`docker: command not found`**  
Установите Docker Desktop и перезапустите терминал.

**«Настройте CONVEX_URL и BOT_API_SECRET»**  
Проверьте файл `.env` в корне проекта (не `.env.local` — compose читает `.env`).

**«Бот не найден или отключён»**  
Создайте бота в админ-панели, проверьте `BOT_SLUG`.

**«Telegram: токен не задан»**  
Токены задаются в админке → **Настройки**, не в `.env`.

**Бот не видит Convex из Docker (dev)**  
Используйте `./scripts/docker-deploy.sh dev`, не production URL localhost.

**Convex недоступен**  
Бот использует fallback из `src/core/content.ts`, но аналитика и динамический контент не работают.

---

## CI/CD

GitHub Actions (`.github/workflows/deploy.yml`) деплоит Convex при push в `main`.

Бот на VPS обновляйте вручную или добавьте отдельный workflow с SSH + `docker compose up -d --build`.

Секреты для CI бота (пример):

- `CONVEX_URL`
- `BOT_API_SECRET`
- `BOT_SLUG`
- SSH-ключ к серверу
