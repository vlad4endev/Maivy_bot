import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireAdminSession } from "./lib/auth";

const DEFAULT_ABOUT_STEPS = [
  {
    slug: "about_1",
    title: "О платформе, миссии и основателях",
    body: `Maivy — платформа умного поиска и трансформации B2B-продаж.

<b>Миссия</b> — сделать поиск товаров для бизнеса таким же простым и точным, как разговор с опытным менеджером: без долгих созвонов, бесконечных прайсов и потерянных заявок.

<b>Команда</b> объединяет экспертизу в оптовой торговле, продуктовой разработке и AI. Мы строим инструмент, который помогает компаниям быстрее находить нужное и масштабировать продажи.`,
  },
  {
    slug: "about_2",
    title: "Трансформация",
    body: `Рынок B2B меняется: покупатели хотят мгновенный ответ, а команды продаж тонут в рутине.

Maivy трансформирует привычный процесс:
• от ручного подбора — к умному поиску за секунды
• от хаоса в переписке — к структурированным сценариям
• от потери лидов — к прозрачной воронке

Это не «ещё один каталог», а новый стандарт взаимодействия опта с клиентом.`,
  },
  {
    slug: "about_3",
    title: "Решение",
    body: `Maivy соединяет каталог, поиск и сценарии продаж в одном интерфейсе.

Платформа понимает запросы на естественном языке, подбирает релевантные позиции и помогает менеджеру закрывать сделку быстрее.

Для бизнеса это означает:
✓ меньше времени на обработку заявок
✓ выше конверсия из обращения в заказ
✓ единый опыт для клиента в мессенджерах и на сайте`,
  },
  {
    slug: "about_4",
    title: "Возможности",
    body: `С Maivy вы получаете:

🔍 <b>Умный поиск</b> — по названию, категории, задаче или описанию потребности

📋 <b>Готовые сценарии</b> — скрипты для типовых запросов клиентов

🤖 <b>Автоматизация</b> — бот отвечает 24/7 и передаёт горячие лиды менеджеру

📊 <b>Аналитика</b> — видно, что ищут клиенты и где теряются продажи

🔗 <b>Интеграции</b> — подключение к вашему каталогу и CRM`,
  },
  {
    slug: "about_5",
    title: "Технологии",
    body: `В основе Maivy — современный AI-стек:

• семантический поиск по товарной матрице
• обработка естественного языка (NLP)
• рекомендательные алгоритмы под контекст запроса
• API-first архитектура для быстрой интеграции

Технологии работают незаметно для пользователя — он просто получает точный ответ на свой вопрос.`,
  },
  {
    slug: "about_6",
    title: "Кейсы",
    body: `Maivy уже помогает бизнесу ускорять продажи:

<b>Оптовая торговля</b> — клиенты находят товары для магазинов и HoReCa за минуты вместо часов переписки

<b>Менеджеры</b> — получают готовую подборку и тратят время на закрытие сделки, а не на ручной поиск

<b>Руководители</b> — видят реальный спрос через поисковые запросы и оптимизируют ассортимент

Каждый кейс начинается с простого вопроса: «А можно найти это быстрее?»`,
  },
  {
    slug: "about_7",
    title: "Бизнес-модель",
    body: `Maivy развивается как платформа для B2B-компаний:

• <b>Пилот</b> — быстрый запуск на вашем каталоге
• <b>Подписка</b> — масштабирование по объёму запросов и интеграций
• <b>Внедрение</b> — кастомизация под процессы вашей компании

Мы зарабатываем вместе с вами: чем эффективнее поиск, тем больше заказов проходит через платформу.

Готовы обсудить формат? Нажмите «Хочу внедрить Maivy» в меню.`,
  },
];

export const seedDefaultBot = mutation({
  args: {
    token: v.string(),
    slug: v.optional(v.string()),
  },
  returns: v.id("bots"),
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.token);

    const slug = args.slug ?? "maivy";

    const existing = await ctx.db
      .query("bots")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    if (existing) {
      throw new Error(`Bot "${slug}" already exists. Use a different slug.`);
    }

    const now = Date.now();
    const botId = await ctx.db.insert("bots", {
      name: "Maivy Bot",
      slug,
      description: "Основной бот Maivy для Telegram и MAX",
      platforms: ["telegram", "max"],
      enabled: true,
      settings: {
        botTagline:
          "Maivy — умный поиск и трансформация B2B-продаж. Находите товары за секунды, а не часы.",
        privacyPolicyUrl: "https://example.com/privacy-policy",
        loomVideoUrl: "https://www.loom.com/share/example",
        grosterUrl: "https://groster.me/",
        contactUsername: "@daerit",
        contactUrl: "https://t.me/daerit",
        welcomeImagePath: "assets/welcome.jpg",
        welcomeVideoPath: "assets/welcome-video.mp4",
        shortDescription: "Умный поиск и трансформация B2B-продаж",
      },
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("sections", {
      botId,
      slug: "welcome",
      title: "Приветствие",
      body: `Добро пожаловать в Maivy! ✨

Maivy — платформа, которая меняет то, как бизнес ищет и покупает товары оптом.

Умный поиск, готовые сценарии и автоматизация — всё в одном месте.

Посмотрите короткое видео ниже и выберите, что вас интересует 👇`,
      order: 0,
      sectionType: "welcome",
      isPublished: true,
      parseMode: "HTML",
      updatedAt: now,
    });

    await ctx.db.insert("sections", {
      botId,
      slug: "menu",
      title: "Главное меню",
      body: "Главное меню Maivy. Выберите действие:",
      order: 1,
      sectionType: "system",
      isPublished: true,
      parseMode: "HTML",
      updatedAt: now,
    });

    for (let i = 0; i < DEFAULT_ABOUT_STEPS.length; i++) {
      const step = DEFAULT_ABOUT_STEPS[i];
      await ctx.db.insert("sections", {
        botId,
        slug: step.slug,
        title: step.title,
        body: step.body,
        order: 10 + i,
        sectionType: "about_step",
        isPublished: true,
        parseMode: "HTML",
        updatedAt: now,
      });
    }

    await ctx.db.insert("sections", {
      botId,
      slug: "demo",
      title: "Как работает Maivy",
      body: `<b>Как работает Maivy</b>

Посмотрите короткую демонстрацию: как клиент формулирует запрос, платформа подбирает товары и передаёт готовую подборку менеджеру.

Видео займёт 3–5 минут — вы увидите весь путь от запроса до результата.`,
      order: 20,
      sectionType: "section",
      isPublished: true,
      parseMode: "HTML",
      updatedAt: now,
    });

    await ctx.db.insert("sections", {
      botId,
      slug: "try",
      title: "Попробуйте Maivy",
      body: `<b>Попробуйте Maivy на практике</b>

Откройте каталог Гростер и протестируйте умный поиск в действии.

<b>Как пользоваться поиском:</b>
1. Опишите задачу своими словами — не нужно знать точное название
2. Уточните категорию или сферу бизнеса, если нужно
3. Выберите из подобранных вариантов и оформите заявку

<b>Примеры запросов:</b>
• «Упаковка для доставки еды»
• «Расходники для кофейни на 50 посадочных мест»
• «Хозтовары для клининговой компании»
• «Одноразовая посуда оптом для фудкорта»`,
      order: 21,
      sectionType: "section",
      isPublished: true,
      parseMode: "HTML",
      updatedAt: now,
    });

    await ctx.db.insert("sections", {
      botId,
      slug: "impl",
      title: "Внедрение Maivy",
      body: `<b>Хотите внедрить Maivy?</b>

Мы подключим платформу к вашему каталогу, настроим сценарии поиска и запустим пилот — обычно это занимает от нескольких дней.

Напишите @daerit — и мы начнём внедрение уже сегодня.`,
      order: 22,
      sectionType: "section",
      isPublished: true,
      parseMode: "HTML",
      updatedAt: now,
    });

    const defaultButtons = [
      { keyboardId: "main_menu", row: 0, col: 0, text: "Узнать больше о Maivy", buttonType: "callback" as const, action: "about_more", targetSlug: "about_1", order: 0 },
      { keyboardId: "main_menu", row: 1, col: 0, text: "Посмотреть, как работает Maivy", buttonType: "callback" as const, action: "demo", targetSlug: "demo", order: 1 },
      { keyboardId: "main_menu", row: 2, col: 0, text: "Попробовать Maivy на практике", buttonType: "callback" as const, action: "try", targetSlug: "try", order: 2 },
      { keyboardId: "main_menu", row: 3, col: 0, text: "Хочу внедрить Maivy", buttonType: "callback" as const, action: "impl", targetSlug: "impl", order: 3 },
      { keyboardId: "about_step", row: 0, col: 0, text: "Далее →", buttonType: "callback" as const, action: "about_next", order: 0 },
      { keyboardId: "about_step", row: 1, col: 0, text: "← В меню", buttonType: "callback" as const, action: "menu", targetSlug: "menu", order: 1 },
      { keyboardId: "back_menu", row: 0, col: 0, text: "← В меню", buttonType: "callback" as const, action: "menu", targetSlug: "menu", order: 0 },
      { keyboardId: "demo", row: 0, col: 0, text: "▶️ Смотреть видео в Loom", buttonType: "url" as const, urlSource: "loomVideoUrl" as const, order: 0 },
      { keyboardId: "demo", row: 1, col: 0, text: "← В меню", buttonType: "callback" as const, action: "menu", targetSlug: "menu", order: 1 },
      { keyboardId: "try", row: 0, col: 0, text: "🛒 Открыть Гростер", buttonType: "url" as const, urlSource: "grosterUrl" as const, order: 0 },
      { keyboardId: "try", row: 1, col: 0, text: "← В меню", buttonType: "callback" as const, action: "menu", targetSlug: "menu", order: 1 },
      { keyboardId: "impl", row: 0, col: 0, text: "✉️ Написать @daerit", buttonType: "url" as const, urlSource: "contactUrl" as const, order: 0 },
      { keyboardId: "impl", row: 1, col: 0, text: "← В меню", buttonType: "callback" as const, action: "menu", targetSlug: "menu", order: 1 },
    ];

    const seededSections = await ctx.db
      .query("sections")
      .withIndex("by_bot", (q) => q.eq("botId", botId))
      .collect();
    const slugToSectionId = new Map(
      seededSections.map((section) => [section.slug, section._id]),
    );

    for (const btn of defaultButtons) {
      const targetSectionId =
        "targetSlug" in btn && btn.targetSlug
          ? slugToSectionId.get(btn.targetSlug)
          : undefined;

      await ctx.db.insert("keyboardButtons", {
        botId,
        keyboardId: btn.keyboardId,
        row: btn.row,
        col: btn.col,
        text: btn.text,
        buttonType: btn.buttonType,
        action:
          targetSectionId && "targetSlug" in btn && btn.targetSlug
            ? `section:${btn.targetSlug}`
            : btn.action,
        targetSectionId,
        urlSource: "urlSource" in btn ? btn.urlSource : undefined,
        order: btn.order,
        isEnabled: true,
        updatedAt: now,
      });
    }

    return botId;
  },
});
