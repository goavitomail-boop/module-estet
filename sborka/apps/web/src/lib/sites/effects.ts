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
/**
 * Премиум-графика первого экрана — платное дополнение «3D-графика»: живые фоны на шейдерах,
 * объекты у края экрана и 3D-пространство на three.js. Каждая сцена — отдельный файл в src/sites/scenes.
 */
export const SCENES = [
  // Живые фоны
  "scene-satin",
  "scene-chrome",
  "scene-mesh",
  "scene-pearl",
  "scene-grain",
  "scene-plasma",
  "scene-curtains",
  "scene-spotlight",
  "scene-rays",
  "scene-threads",
  "scene-bends",
  "scene-glow",
  "scene-bokeh",
  "scene-marble",
  "scene-swirl",
  "scene-neuro",
  "scene-water",
  "scene-topo",
  "scene-halftone",
  "scene-stars",
  "scene-dots",
  "scene-blobs",
  "scene-cells",
  "scene-grain-wave",
  "scene-ripple",
  "scene-border",
  "scene-dither",
  "scene-spiral",
  "scene-beams",
  // Объекты
  "scene-metal",
  "scene-metal-flower",
  "scene-gem",
  "scene-smoke",
  "scene-metaballs",
  "scene-panels",
  "scene-orb",
  "scene-glass",
  "scene-crystal",
  "scene-knot",
  "scene-rings",
  "scene-shapes",
  "scene-helix",
  "scene-globe",
  // 3D-пространство
  "scene-particles",
  "scene-strings",
  "scene-warp",
  "scene-wave",
  "scene-cubes",
  "scene-terrain",
  "scene-silk",
] as const;
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
  /** Раздел 3D-графики: живой фон, объект или 3D-пространство. */
  cat?: SceneCat;
}

export type SceneCat = "bg" | "object" | "space";
export const SCENE_CATS: Record<SceneCat, string> = { bg: "Живые фоны", object: "Объекты", space: "3D-пространство" };

const o = (id: string, title: string, text: string, extra: Partial<EffectOption> = {}): EffectOption => ({ id, title, text, ...extra });
const bg = { paid: true, cat: "bg" } as const;
const obj = { paid: true, cat: "object" } as const;
const space = { heavy: true, paid: true, cat: "space" } as const;

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
      o("scene-satin", "Шёлк", "Мягкие складки ткани переливаются на свету.", bg),
      o("scene-chrome", "Жидкий хром", "Зеркальная жидкость перетекает, в ней отражаются полосы света.", bg),
      o("scene-mesh", "Переливы", "Цветные пятна плывут и перетекают друг в друга.", bg),
      o("scene-pearl", "Перламутр", "Радужные переливы, как внутри ракушки.", bg),
      o("scene-grain", "Зернистое свечение", "Мягкие цветные пятна из углов с плёночным зерном.", bg),
      o("scene-plasma", "Плазма", "Светящийся дым медленно клубится.", bg),
      o("scene-curtains", "Занавес сияния", "Полотна северного сияния колышутся вверху экрана.", bg),
      o("scene-spotlight", "Прожектор", "Лучи света падают сверху, в них блестит пыль.", bg),
      o("scene-rays", "Сияние", "Лучи расходятся из-за края экрана и мерцают.", bg),
      o("scene-threads", "Нити", "Пучок тонких линий веером расходится и колышется.", bg),
      o("scene-bends", "Неоновые изгибы", "Светящиеся ленты плавно изгибаются.", bg),
      o("scene-glow", "Свечение", "Мягкие световые пятна дышат и плавают.", bg),
      o("scene-bokeh", "Боке", "Размытые огни медленно всплывают, как огни вне фокуса.", bg),
      o("scene-marble", "Мрамор", "Цветные разводы закручиваются, как краска на воде.", bg),
      o("scene-swirl", "Водоворот", "Мягкие полосы цвета закручиваются в спираль.", bg),
      o("scene-neuro", "Нейросеть", "Паутина светящихся линий медленно перетекает.", bg),
      o("scene-water", "Вода", "Блики и каустика, как солнце на дне бассейна.", bg),
      o("scene-topo", "Топография", "Линии высот, как на карте, медленно перетекают.", bg),
      o("scene-halftone", "Точечная волна", "Сетка точек растёт и сжимается волнами.", bg),
      o("scene-stars", "Звёздное небо", "Мерцающие звёзды и туманность в цвете сайта.", bg),
      o("scene-dots", "Точки-орбиты", "Цветные точки кружат каждая вокруг своего места.", bg),
      o("scene-blobs", "Плавные пятна", "Крупные мягкие пятна цвета меняют форму.", bg),
      o("scene-cells", "Ячейки", "Живая сетка ячеек со светящимися краями.", bg),
      o("scene-grain-wave", "Зернистая волна", "Цветная волна с зерном проходит по экрану.", bg),
      o("scene-ripple", "Круги", "Цветные круги расходятся, как по воде.", bg),
      o("scene-border", "Светящаяся рамка", "По краю первого экрана бегут переливы света.", bg),
      o("scene-dither", "Ретро-пиксели", "Волны из крупных пикселей, как на старых экранах.", bg),
      o("scene-spiral", "Спираль", "Волнистые кольца расходятся из точки справа.", bg),
      o("scene-beams", "Лучи", "Мягкие косые лучи света скользят по экрану.", bg),
      o("scene-metal", "Жидкий металл", "Капли ртути перетекают и сливаются.", obj),
      o("scene-metal-flower", "Металлический цветок", "Хромированный цветок с бегущими бликами.", obj),
      o("scene-gem", "Дымчатый кристалл", "Внутри стеклянного ромба клубится цветной дым.", obj),
      o("scene-smoke", "Дымное кольцо", "Светящийся дым закручивается в кольцо.", obj),
      o("scene-metaballs", "Лавовая лампа", "Мягкие капли сливаются и расходятся.", obj),
      o("scene-panels", "Световые панели", "Светящиеся пластины вращаются вокруг оси.", obj),
      o("scene-orb", "Капля", "Глянцевая форма плавно перетекает и поворачивается за курсором.", obj),
      o("scene-glass", "Стеклянные фигуры", "Прозрачные фигуры из стекла парят и переливаются.", obj),
      o("scene-crystal", "Кристалл", "Гранёный кристалл с радужными бликами и осколками на орбите.", obj),
      o("scene-knot", "Узел", "Глянцевый бесконечный узел медленно вращается.", obj),
      o("scene-rings", "Гироскоп", "Металлические кольца вращаются вокруг светящегося ядра.", obj),
      o("scene-shapes", "Парящие фигуры", "Шары, кубы и кольца плывут в невесомости.", obj),
      o("scene-helix", "Спираль ДНК", "Двойная спираль — для медицины, косметологии, науки.", obj),
      o("scene-globe", "Глобус", "Глобус из точек со светящимися маршрутами.", obj),
      o("scene-particles", "Галактика", "Облако светящихся частиц закручено спиралью.", space),
      o("scene-strings", "Струны", "Тонкие линии текут волной в пространстве.", space),
      o("scene-warp", "Гиперпрыжок", "Звёзды летят навстречу, как при прыжке в гиперпространство.", space),
      o("scene-wave", "Волна из точек", "Сетка из точек плавно дышит под заголовком.", space),
      o("scene-cubes", "Кубы", "Поле из кубиков поднимается волнами, под курсором вырастает холм.", space),
      o("scene-terrain", "Ретро-горы", "Сетчатые горы бегут навстречу, на горизонте — солнце.", space),
      o("scene-silk", "Атласные ленты", "Глянцевые ленты изгибаются и закручиваются.", space),
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
