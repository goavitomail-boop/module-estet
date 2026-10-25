import { z } from "zod";

/**
 * Всё, что клиент может добавить к сайту, и цены. Один источник для лендинга,
 * брифа, кабинета и оплаты. Описания — простыми словами: что это даёт бизнесу.
 */

/** Сайт под ключ. */
export const SITE_PRICE = 4999;

export const ADDON_IDS = [
  "feature-quiz",
  "feature-lookbook",
  "feature-menu",
  "feature-wizard",
  "scene3d",
  "maps",
  "yclients",
  "payments",
  "page",
  "urgent",
  "hosting",
  "miniapp",
] as const;
export type AddonId = (typeof ADDON_IDS)[number];

export type AddonGroup = "features" | "promo" | "extend" | "service";

export interface Addon {
  id: AddonId;
  group: AddonGroup;
  title: string;
  /** Зачем это бизнесу — одна фраза. */
  why: string;
  /** Подробнее: как работает и что нужно от клиента. */
  details: string;
  price: number;
  billing: "once" | "monthly";
  /** Подпись к цене: «за страницу», «со 2-го месяца». */
  unit?: string;
  /** Видно на прототипе до оплаты. */
  preview?: boolean;
  /** Можно взять несколько штук. */
  maxQty?: number;
  /** Отдельный заказ: не входит в оплату сайта, делаем и показываем после. */
  separate?: boolean;
  /** Варианты на выбор (мини-приложение: Telegram, MAX или оба). */
  options?: { id: string; title: string; price: number }[];
}

export const ADDONS: Record<AddonId, Addon> = {
  "feature-quiz": {
    id: "feature-quiz",
    group: "features",
    title: "Тест-подбор услуги",
    why: "Посетитель отвечает на три вопроса, и сайт советует, с чего начать. Сомневающиеся чаще записываются.",
    details: "Вопросы строим по вашим услугам: что интересует, когда удобно, были ли у вас раньше. В конце — совет и кнопка записи.",
    price: 990,
    billing: "once",
    preview: true,
  },
  "feature-lookbook": {
    id: "feature-lookbook",
    group: "features",
    title: "Прайс с фото работ",
    why: "Наводите на услугу — рядом появляется фото результата. Цена и портфолио в одном блоке.",
    details: "Подходит, если результат работы видно глазами: стрижки, маникюр, ремонт, букеты. Свои фото добавите позже.",
    price: 990,
    billing: "once",
    preview: true,
  },
  "feature-menu": {
    id: "feature-menu",
    group: "features",
    title: "Витрина услуг",
    why: "Услуги сами листаются крупно, с фото и ценой, как витрина. Глаз цепляется, даже если человек просто листает.",
    details: "Позиции берём из вашего списка услуг. Посетитель может остановить витрину и выбрать позицию сам.",
    price: 990,
    billing: "once",
    preview: true,
  },
  "feature-wizard": {
    id: "feature-wizard",
    group: "features",
    title: "Запись прямо на странице",
    why: "Форма записи по шагам встроена в страницу — не нужно искать кнопку. Удобно тем, кто пришёл именно записаться.",
    details: "Те же шаги, что в окне записи: услуга, день и время, контакты. Окно записи по кнопкам тоже останется.",
    price: 990,
    billing: "once",
    preview: true,
  },
  scene3d: {
    id: "scene3d",
    group: "features",
    title: "3D-графика на первом экране",
    why: "Объёмная сцена в цветах вашего сайта: 15 на выбор — глянцевая капля, стеклянные фигуры, кристалл, глобус, шёлковая лента, ретро-горы и другие. Такое обычно делают только студии.",
    details: "Вид выбираете в редакторе на сайте, в эффектах первого экрана. На слабых телефонах сцена упрощается, чтобы сайт не тормозил.",
    price: 1990,
    billing: "once",
    preview: true,
  },
  maps: {
    id: "maps",
    group: "promo",
    title: "Яндекс Карты и статистика",
    why: "Карта проезда прямо на сайте, а вы видите, сколько людей зашли на сайт и откуда.",
    details: "Ставим карту Яндекса с вашей точкой и подключаем Яндекс Метрику — бесплатную статистику посещений. Доступ к ней будет у вас.",
    price: 990,
    billing: "once",
  },
  yclients: {
    id: "yclients",
    group: "promo",
    title: "Запись через YCLIENTS или DIKIDI",
    why: "Если вы уже ведёте запись в YCLIENTS или DIKIDI, кнопки сайта откроют вашу запись там.",
    details: "Пришлёте ссылку на свою страницу записи — подключим. Все записи останутся в привычной программе.",
    price: 990,
    billing: "once",
  },
  payments: {
    id: "payments",
    group: "extend",
    title: "Онлайн-оплата и предоплата",
    why: "Клиент платит картой или по СБП прямо на сайте: меньше «потерявшихся» записей и заказов.",
    details: "Подключаем приём оплаты через ЮKassa на ваш счёт. Понадобится ИП или самозанятость.",
    price: 3990,
    billing: "once",
  },
  page: {
    id: "page",
    group: "extend",
    title: "Дополнительная страница",
    why: "Отдельная страница под большой прайс, портфолио или одну важную услугу.",
    details: "В том же стиле, что и главная. Напишите в правках, что должно быть на странице.",
    price: 1990,
    billing: "once",
    unit: "за страницу",
    maxQty: 5,
  },
  urgent: {
    id: "urgent",
    group: "service",
    title: "Срочно за 3 часа",
    why: "Нужен сайт сегодня — соберём и опубликуем за 3 часа после оплаты.",
    details: "Без очереди: ваш заказ берём в работу первым.",
    price: 1990,
    billing: "once",
  },
  hosting: {
    id: "hosting",
    group: "service",
    title: "Хостинг и поддержка",
    why: "Чтобы сайт продолжал работать после первого месяца: хранение, обновления, резервные копии, мелкие правки.",
    details: "Первый месяц входит в цену сайта. Можно отказаться и перенести сайт к себе — отдадим файлы.",
    price: 490,
    billing: "monthly",
    unit: "в месяц со 2-го месяца",
  },
  miniapp: {
    id: "miniapp",
    group: "extend",
    title: "Мини-приложение в Telegram или MAX",
    why: "Клиенты записываются и заказывают прямо в мессенджере, а бот напоминает им о записи.",
    details: "Делаем отдельным заказом после запуска сайта и тоже показываем до оплаты. Цена зависит от того, что должно уметь приложение.",
    price: 9990,
    billing: "once",
    separate: true,
    options: [
      { id: "telegram", title: "Telegram", price: 9990 },
      { id: "max", title: "MAX", price: 9990 },
      { id: "both", title: "Telegram и MAX", price: 14990 },
    ],
  },
};

export const ADDON_GROUPS: { id: AddonGroup; title: string; lead: string }[] = [
  { id: "features", title: "Фишки", lead: "Интерактивные блоки, которые цепляют посетителя. Одна фишка вашей сферы уже входит в цену." },
  { id: "promo", title: "Продвижение и запись", lead: "Чтобы вас находили и записывались удобно." },
  { id: "extend", title: "Расширение", lead: "Когда одной страницы и окна записи мало." },
  { id: "service", title: "Сроки и обслуживание", lead: "" },
];

/** Что входит в 4 999 ₽ — для брифа, кабинета и лендинга. */
export const INCLUDED = [
  "Дизайн и тексты под ваш бизнес",
  "Все блоки страницы и одна фишка вашей сферы",
  "Онлайн-запись по шагам",
  "Заявки в Telegram, MAX или на почту",
  "Версия для телефона",
  "2 других варианта и 3 правки",
  "Публикация, домен .ru на год и первый месяц хостинга",
];

export const LEAD_CHANNELS = ["telegram", "max", "email"] as const;
export type LeadChannel = (typeof LEAD_CHANNELS)[number];

export const LEAD_LABEL: Record<LeadChannel, { title: string; text: string }> = {
  telegram: { title: "Telegram", text: "Бот пришлёт заявку сообщением. После оплаты дадим ссылку: нажмёте «Старт» — и готово." },
  max: { title: "MAX", text: "Так же, как в Telegram, только в мессенджере MAX." },
  email: { title: "Почта", text: "Заявки придут письмом на ваш адрес." },
};

export const LeadsSchema = z
  .object({
    channels: z.array(z.enum(LEAD_CHANNELS)).min(1, "Выберите, куда присылать заявки"),
    email: z.string().trim().max(120).default(""),
  })
  .superRefine((v, ctx) => {
    if (v.channels.includes("email") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) {
      ctx.addIssue({ code: "custom", path: ["email"], message: "Укажите почту для заявок" });
    }
  });
export type Leads = z.infer<typeof LeadsSchema>;

export const AddonSelectionSchema = z.object({
  id: z.enum(ADDON_IDS),
  qty: z.number().int().min(1).max(5).optional(),
  option: z.string().max(20).optional(),
});
export type AddonSelection = z.infer<typeof AddonSelectionSchema>;

export interface QuoteLine {
  id: AddonId | "site";
  title: string;
  amount: number;
}

export interface Quote {
  /** Разовый платёж за сайт с дополнениями — его клиент оплачивает. */
  lines: QuoteLine[];
  total: number;
  /** Ежемесячные платежи — начинаются со 2-го месяца. */
  monthly: QuoteLine[];
  /** Отдельные заказы: делаем после сайта, оплачиваются отдельно. */
  separate: QuoteLine[];
}

/** Цена дополнения с учётом количества и выбранного варианта. */
export function addonPrice(sel: AddonSelection) {
  const addon = ADDONS[sel.id];
  const option = addon.options?.find((o) => o.id === sel.option);
  return (option?.price ?? addon.price) * (addon.maxQty ? (sel.qty ?? 1) : 1);
}

export function addonTitle(sel: AddonSelection) {
  const addon = ADDONS[sel.id];
  const option = addon.options?.find((o) => o.id === sel.option);
  if (option) return `Мини-приложение: ${option.title}`;
  if (addon.maxQty && (sel.qty ?? 1) > 1) return `${addon.title} × ${sel.qty}`;
  return addon.title;
}

/** Расчёт заказа. Считается на сервере при оплате и в интерфейсе для подсказок. */
export function quote(selection: AddonSelection[]): Quote {
  const lines: QuoteLine[] = [{ id: "site", title: "Сайт под ключ", amount: SITE_PRICE }];
  const monthly: QuoteLine[] = [];
  const separate: QuoteLine[] = [];
  for (const sel of selection) {
    const addon = ADDONS[sel.id];
    const line = { id: sel.id, title: addonTitle(sel), amount: addonPrice(sel) };
    if (addon.separate) separate.push(line);
    else if (addon.billing === "monthly") monthly.push(line);
    else lines.push(line);
  }
  return { lines, total: lines.reduce((sum, l) => sum + l.amount, 0), monthly, separate };
}

/** «4 999 ₽» с неразрывными пробелами. */
export function rub(amount: number) {
  return `${amount.toLocaleString("ru-RU")} ₽`;
}

/** Фишки-дополнения: какой интерактивный блок добавляет каждая. */
export const FEATURE_ADDONS = {
  "feature-quiz": "quiz",
  "feature-lookbook": "lookbook",
  "feature-menu": "menu",
  "feature-wizard": "wizard",
} as const satisfies Partial<Record<AddonId, string>>;
