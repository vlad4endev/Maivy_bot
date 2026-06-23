export const AI_SOLUTIONS_SLUG = "ai_solutions";
export const AI_SMART_SEARCH_SLUG = "ai_smart_search";
export const AI_CONSULTANT_SLUG = "ai_consultant";
export const AI_CATALOG_SLUG = "ai_catalog";

export const DEFAULT_GROSTER_SEARCH_URL =
  "https://moscow.groster-dev.vertical-tech.ru/search/";
export const DEFAULT_AI_CONSULTANT_URL = "https://ourgold.maivy.ru";
export const DEFAULT_AI_CATALOG_URL = "https://catalog.maivy.ru";

export const AI_SOLUTIONS_SECTIONS = [
  {
    slug: AI_SOLUTIONS_SLUG,
    title: "Что умеют наши ИИ-решения?",
    body: `<b>Что умеют наши ИИ-решения?</b>

Выберите технологию, чтобы узнать, как она работает, и протестировать её в действии 👇`,
    order: 19,
    keyboardId: AI_SOLUTIONS_SLUG,
  },
  {
    slug: AI_SMART_SEARCH_SLUG,
    title: "Умный поиск",
    body: `<b>Умный поиск</b>

Для тех, кто ищет через строку поиска. Понимает запрос целиком — вместо набора фильтров и точных характеристик.

<b>Пример:</b> «тихий пылесос для квартиры с котом» → подходящие модели, а не пустая выдача.`,
    order: 23,
    keyboardId: AI_SMART_SEARCH_SLUG,
  },
  {
    slug: AI_CONSULTANT_SLUG,
    title: "ИИ-консультант (Mavi)",
    body: `<b>ИИ-консультант</b>

Для тех, кому проще спросить. Отвечает в диалоге — в чате на сайте или в Telegram — и помогает выбрать товар, как живой консультант.

<b>Пример:</b> «что подарить жене на годовщину до 10 000?» → подборка с пояснением, почему именно это.`,
    order: 24,
    keyboardId: AI_CONSULTANT_SLUG,
  },
  {
    slug: AI_CATALOG_SLUG,
    title: "ИИ-каталог",
    body: `<b>ИИ-каталог</b>

Весь магазин в формате диалога. Слева — чат-консультант, справа — живая витрина со всеми подходящими товарами и бесконечным скроллом.

<b>Пример:</b> «лёгкие красные кроссовки до 6000» → витрина собирает все подходящие модели (топ-3 от ИИ сверху), а «а подешевле» фильтрует текущую выборку.`,
    order: 25,
    keyboardId: AI_CATALOG_SLUG,
  },
] as const;

type AiSolutionsButton = {
  keyboardId: string;
  row: number;
  col: number;
  text: string;
  buttonType: "callback" | "url";
  action?: string;
  targetSlug?: string;
  urlSource?: "grosterUrl" | "aiConsultantUrl" | "aiCatalogUrl";
  order: number;
};

export const AI_SOLUTIONS_BUTTONS: AiSolutionsButton[] = [
  {
    keyboardId: AI_SOLUTIONS_SLUG,
    row: 0,
    col: 0,
    text: "🔍 Умный поиск",
    buttonType: "callback",
    targetSlug: AI_SMART_SEARCH_SLUG,
    order: 0,
  },
  {
    keyboardId: AI_SOLUTIONS_SLUG,
    row: 1,
    col: 0,
    text: "🤖 ИИ-консультант (Mavi)",
    buttonType: "callback",
    targetSlug: AI_CONSULTANT_SLUG,
    order: 1,
  },
  {
    keyboardId: AI_SOLUTIONS_SLUG,
    row: 2,
    col: 0,
    text: "🛍 ИИ-каталог",
    buttonType: "callback",
    targetSlug: AI_CATALOG_SLUG,
    order: 2,
  },
  {
    keyboardId: AI_SOLUTIONS_SLUG,
    row: 3,
    col: 0,
    text: "← В меню",
    buttonType: "callback",
    action: "menu",
    targetSlug: "menu",
    order: 3,
  },
  {
    keyboardId: AI_SMART_SEARCH_SLUG,
    row: 0,
    col: 0,
    text: "Попробовать умный поиск",
    buttonType: "url",
    urlSource: "grosterUrl",
    order: 0,
  },
  {
    keyboardId: AI_SMART_SEARCH_SLUG,
    row: 1,
    col: 0,
    text: "← К списку ИИ-решений",
    buttonType: "callback",
    targetSlug: AI_SOLUTIONS_SLUG,
    order: 1,
  },
  {
    keyboardId: AI_CONSULTANT_SLUG,
    row: 0,
    col: 0,
    text: "Попробовать ИИ-консультанта",
    buttonType: "url",
    urlSource: "aiConsultantUrl",
    order: 0,
  },
  {
    keyboardId: AI_CONSULTANT_SLUG,
    row: 1,
    col: 0,
    text: "← К списку ИИ-решений",
    buttonType: "callback",
    targetSlug: AI_SOLUTIONS_SLUG,
    order: 1,
  },
  {
    keyboardId: AI_CATALOG_SLUG,
    row: 0,
    col: 0,
    text: "Посмотреть прототип",
    buttonType: "url",
    urlSource: "aiCatalogUrl",
    order: 0,
  },
  {
    keyboardId: AI_CATALOG_SLUG,
    row: 1,
    col: 0,
    text: "← К списку ИИ-решений",
    buttonType: "callback",
    targetSlug: AI_SOLUTIONS_SLUG,
    order: 1,
  },
];

export const MAIN_MENU_AI_SOLUTIONS_BUTTON = {
  keyboardId: "main_menu",
  row: 2,
  col: 0,
  text: "Что умеют наши ИИ-решения?",
  buttonType: "callback" as const,
  action: "ai_solutions",
  targetSlug: AI_SOLUTIONS_SLUG,
  order: 2,
};
