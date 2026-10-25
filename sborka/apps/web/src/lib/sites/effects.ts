/**
 * Библиотека эффектов и анимаций, которые клиент выбирает сам: эффект первого экрана
 * (в том числе 3D), заставка, характер появления блоков, курсор, кнопка записи, декор
 * и вид отдельных блоков. По умолчанию всё берётся из «почерка» сферы (signature.ts) и темы.
 * Модуль без zod — его читает рендерер, который попадает в код главной.
 */

import type { Block } from "./schema";

export const HERO_FX = [
  "steam",
  "swatches",
  "blueprint",
  "beam",
  "aurora",
  "pulse",
  "document",
  "pole",
  "bubbles",
  "liquid",
  "trail",
  "petals",
] as const;
/** 3D-сцены на three.js — платное дополнение «3D-графика». */
export const SCENES = ["scene-orb", "scene-particles", "scene-wave"] as const;
export const INTROS = ["photos", "counter", "split", "circle", "letters"] as const;
export const MOTIONS = ["soft", "elegant", "bold"] as const;
export const CURSORS = ["ring", "blend"] as const;
export const FABS = ["circle", "pill", "square", "tab"] as const;
export const DECORS = ["marquee", "blobs", "lines", "badge", "chips"] as const;
export const GALLERIES = ["bento", "polaroid", "hscroll", "filmstrip", "masonry", "arches"] as const;
export const STEPS_KINDS = ["stack", "timeline", "row", "big"] as const;
export const REVIEWS_KINDS = ["grid", "notes", "marquee", "slider", "chat"] as const;
export const FAQS = ["accordion", "numbered", "cards"] as const;
export const SERVICE_STYLES = ["photo", "arch", "icon", "list"] as const;

export type HeroFx = (typeof HERO_FX)[number];
export type Scene = (typeof SCENES)[number];

/** Что клиент выбрал сам. Пустое поле — как задумано для сферы; "none" — выключить. */
export interface SiteEffects {
  fx?: HeroFx | Scene | "none";
  intro?: (typeof INTROS)[number] | "none";
  motion?: (typeof MOTIONS)[number] | "none";
  cursor?: (typeof CURSORS)[number] | "none";
  fab?: (typeof FABS)[number] | "none";
  decor?: (typeof DECORS)[number][];
  gallery?: (typeof GALLERIES)[number];
  steps?: (typeof STEPS_KINDS)[number];
  reviews?: (typeof REVIEWS_KINDS)[number];
  faq?: (typeof FAQS)[number];
  services?: (typeof SERVICE_STYLES)[number];
  cinema?: boolean;
  highlight?: boolean;
}

export const isScene = (fx?: string): fx is Scene => !!fx && fx.startsWith("scene-");

export interface EffectOption {
  id: string;
  title: string;
  text: string;
  /** Тяжелее остальных: на слабых телефонах упрощается. */
  heavy?: boolean;
  /** Платное дополнение. */
  paid?: boolean;
}

const o = (id: string, title: string, text: string, extra: Partial<EffectOption> = {}): EffectOption => ({ id, title, text, ...extra });

/** Группы выбора: на каком блоке или для всего сайта, и какие варианты. */
export const EFFECT_GROUPS = {
  fx: {
    title: "Эффект первого экрана",
    lead: "Что происходит на первом экране, пока человек читает заголовок.",
    options: [
      o("none", "Без эффекта", "Только фото и текст — спокойно и строго."),
      o("aurora", "Северное сияние", "Мягкие цветные переливы на фоне."),
      o("beam", "Луч света", "Световой луч проходит по экрану, как фары в темноте."),
      o("pulse", "Пульс", "Энергичные волны от центра — для спорта и драйва."),
      o("bubbles", "Пузырьки", "Пузыри медленно всплывают по экрану."),
      o("petals", "Лепестки", "Лепестки плавно падают сверху."),
      o("blueprint", "Чертёж", "Линии чертежа прорисовываются поверх экрана."),
      o("trail", "След из фото", "За курсором тянется лента ваших фото."),
      o("steam", "Пар", "Тонкий пар поднимается над фото."),
      o("liquid", "Жидкое стекло", "Глянцевая капля с бликами поверх фото."),
      o("swatches", "Орбита оттенков", "Капли цвета кружат вокруг фото."),
      o("document", "Документ с печатью", "Лист с вашим названием и печатью рядом с фото."),
      o("pole", "Барбер-шест", "Вращающийся полосатый шест — классика барбершопа."),
      o("scene-orb", "3D-капля", "Объёмная глянцевая форма в цвете сайта. Поворачивается за курсором.", { heavy: true, paid: true }),
      o("scene-particles", "3D-частицы", "Облако светящихся частиц, которое реагирует на курсор.", { heavy: true, paid: true }),
      o("scene-wave", "3D-волна", "Сетка-волна, которая плавно дышит под заголовком.", { heavy: true, paid: true }),
    ],
  },
  intro: {
    title: "Заставка при открытии",
    lead: "Первые полторы секунды: с чего начинается знакомство с сайтом.",
    options: [
      o("none", "Без заставки", "Сайт открывается сразу."),
      o("circle", "Круг с иконкой", "Иконка и название в центре, затем сайт раскрывается."),
      o("letters", "Буквы по одной", "Название появляется буква за буквой."),
      o("split", "Шторки", "Экран разъезжается, как занавес."),
      o("counter", "Счётчик", "Цифры от 0 до 100, как загрузка."),
      o("photos", "Слайды фото", "Ваши фото быстро сменяют друг друга."),
    ],
  },
  motion: {
    title: "Как появляются блоки",
    lead: "Характер движения при прокрутке.",
    options: [
      o("soft", "Мягко", "Плавно выплывают снизу."),
      o("elegant", "Элегантно", "Медленно, построчно, как в журнале."),
      o("bold", "Энергично", "Быстро и с характером."),
      o("none", "Без анимации", "Всё сразу на месте — для строгих сайтов."),
    ],
  },
  cursor: {
    title: "Курсор",
    lead: "Только на компьютере, на телефоне курсора нет.",
    options: [
      o("none", "Обычный", "Стандартная стрелка."),
      o("ring", "Кольцо", "Кольцо мягко следует за курсором и растёт над кнопками."),
      o("blend", "Инверсия", "Круг, который инвертирует цвета под собой."),
    ],
  },
  fab: {
    title: "Плавающая кнопка записи",
    lead: "Появляется, когда первый экран прокручен, — записаться можно с любого места.",
    options: [
      o("circle", "Круг с бегущим текстом", "Текст бежит по кругу вокруг иконки."),
      o("pill", "Пилюля", "Аккуратная кнопка в углу."),
      o("square", "Квадрат", "Строгая кнопка в углу."),
      o("tab", "Язычок сбоку", "Вертикальная закладка у края экрана."),
      o("none", "Без кнопки", "Только кнопки в блоках."),
    ],
  },
  decor: {
    title: "Декор",
    lead: "Можно выбрать несколько.",
    options: [
      o("marquee", "Бегущая строка", "Лента с вашими услугами под первым экраном."),
      o("blobs", "Пятна цвета", "Мягкие цветные пятна на фоне."),
      o("lines", "Линии сетки", "Тонкие вертикальные линии через весь сайт."),
      o("badge", "Вращающаяся печать", "Круглая печать с названием и городом."),
      o("chips", "Плашки на фото", "Адрес и часы работы поверх фото."),
    ],
  },
  gallery: {
    title: "Вид галереи",
    lead: "",
    options: [
      o("bento", "Мозаика", "Фото разного размера, как плитка."),
      o("polaroid", "Полароиды", "Снимки разложены на столе и выпрямляются при наведении."),
      o("hscroll", "Лента вбок", "Фото листаются вбок, пока секция закреплена.", { heavy: true }),
      o("filmstrip", "Плёнка", "Две ленты фото едут навстречу друг другу."),
      o("masonry", "Колонки", "Колонки разной высоты, по клику — во весь экран."),
      o("arches", "Арки", "Фото в арочных рамках."),
    ],
  },
  steps: {
    title: "Вид этапов работы",
    lead: "",
    options: [
      o("stack", "Карточки стопкой", "Карточки ложатся друг на друга при прокрутке."),
      o("timeline", "Линия времени", "Этапы на вертикальной линии."),
      o("row", "В ряд", "Этапы в ряд с пунктирной линией."),
      o("big", "Крупные номера", "Огромные цифры и короткий текст."),
    ],
  },
  reviews: {
    title: "Вид отзывов",
    lead: "",
    options: [
      o("grid", "Сетка", "Аккуратные карточки."),
      o("notes", "Записки", "Отзывы как записки на стене."),
      o("marquee", "Бегущая лента", "Отзывы плывут по экрану."),
      o("slider", "Слайдер", "Один отзыв крупно, листается."),
      o("chat", "Переписка", "Отзывы в виде сообщений мессенджера."),
    ],
  },
  faq: {
    title: "Вид вопросов",
    lead: "",
    options: [
      o("accordion", "Список", "Вопрос раскрывается по нажатию."),
      o("numbered", "С номерами", "Крупные номера у каждого вопроса."),
      o("cards", "Карточки", "Все ответы видны сразу."),
    ],
  },
  services: {
    title: "Вид услуг",
    lead: "",
    options: [
      o("photo", "Фото-карточки", "Карточки с фото каждой услуги."),
      o("arch", "Арки", "Две главные услуги в арках, остальные списком."),
      o("icon", "Иконки", "Карточки с иконками и кнопкой записи."),
      o("list", "Прайс строками", "Как меню: название, точки, цена."),
    ],
  },
  cinema: {
    title: "Вид цитаты",
    lead: "",
    options: [
      o("on", "На весь экран", "Фото раскрывается во весь экран при прокрутке, поверх — цитата."),
      o("off", "Полоса", "Цитата в яркой полосе."),
    ],
  },
  highlight: {
    title: "Текст «О нас»",
    lead: "",
    options: [o("on", "Проявляется по словам", "Слова загораются по мере прокрутки."), o("off", "Обычный абзац", "Спокойный текст.")],
  },
} satisfies Record<string, { title: string; lead: string; options: EffectOption[] }>;

export type EffectGroup = keyof typeof EFFECT_GROUPS;

/** Эффекты для всего сайта — в том порядке, в каком их показывает редактор. */
export const SITE_GROUPS = ["fx", "intro", "motion", "fab", "cursor", "decor"] as const satisfies readonly EffectGroup[];

const BLOCK_EFFECT: Partial<Record<Block["type"], EffectGroup>> = {
  gallery: "gallery",
  steps: "steps",
  reviews: "reviews",
  faq: "faq",
  services: "services",
  about: "highlight",
};

/** Какую группу эффектов открывает кнопка «Эффект» на блоке; у полосы — только если в ней цитата. */
export function blockEffect(block: Block): EffectGroup | undefined {
  if (block.type === "strip") return block.quote ? "cinema" : undefined;
  return BLOCK_EFFECT[block.type];
}
