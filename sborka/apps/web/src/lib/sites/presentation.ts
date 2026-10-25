import { plural } from "@/lib/plural";
import { SIGNATURES } from "@/sites/signature";
import type { SiteEffects } from "./effects";
import type { Block, FeatureKind, SiteSpec } from "./schema";
import { DISPLAY_FONTS, textOn } from "./style";
import { getTheme, heroLayout, type HeroLayout } from "./themes";

/**
 * Как показать собранный сайт клиенту: стиль варианта, экран сборки
 * и экскурсия по блокам в кабинете. Всё считается из SiteSpec.
 */

const LAYOUT: Record<HeroLayout, string> = {
  split: "фото справа",
  overlay: "фото на весь экран",
  centered: "заголовок по центру",
  editorial: "журнальная вёрстка",
  collage: "коллаж из фото",
};

export const FEATURE_LABEL: Record<FeatureKind, string> = {
  menu: "Витрина меню",
  palette: "Подбор оттенка",
  calculator: "Калькулятор стоимости",
  hotspots: "Точки на фото",
  breathe: "Дыхательная практика",
  quiz: "Тест-подбор",
  navigator: "Навигатор по ситуациям",
  lookbook: "Прайс с фото работ",
  wipe: "«Протрите стекло»",
  wizard: "Запись по шагам",
  postcard: "Открытка к букету",
};

export const FEATURE_TEXT: Record<FeatureKind, string> = {
  menu: "Гость листает категории меню и сразу видит цены. Позиции — из вашего брифа.",
  palette: "Клиентка выбирает оттенок покрытия и видит, как он смотрится. Так проще решиться на запись.",
  calculator: "Посетитель вводит площадь и сразу видит примерную стоимость по вашим ценам за метр.",
  hotspots: "Наведите на деталь машины — появится услуга и цена. Клиент сам находит, что ему нужно.",
  breathe: "Короткая дыхательная практика прямо на сайте: человек успокаивается и лучше чувствует ваш подход.",
  quiz: "Три вопроса — и сайт подбирает программу. Посетитель вовлекается и чаще записывается.",
  navigator: "Человек выбирает свою ситуацию и видит, как вы поможете и сколько это стоит.",
  lookbook: "Наведите на услугу — рядом появится фото работы. Прайс и портфолио в одном блоке.",
  wipe: "Посетитель стирает «грязь» курсором или пальцем и видит чистое окно. Запоминается сразу.",
  wizard: "Пациент выбирает услугу и время по шагам, без звонка в регистратуру.",
  postcard: "Покупатель пишет текст открытки прямо на сайте и видит, как она будет выглядеть.",
};

export const BLOCK_LABEL: Record<Exclude<Block["type"], "feature">, string> = {
  services: "Услуги и цены",
  strip: "Лента преимуществ",
  about: "О вас",
  gallery: "Галерея",
  steps: "Как проходит работа",
  team: "Команда",
  reviews: "Отзывы",
  pricing: "Тарифы",
  stats: "Цифры",
  schedule: "Расписание",
  cta: "Призыв записаться",
  faq: "Частые вопросы",
};

/** «'Playfair Display Variable', Georgia, serif» → «Playfair Display». */
export function fontName(css: string) {
  return css
    .split(",")[0]
    .replace(/['"]/g, "")
    .replace(/ Variable$/, "")
    .trim();
}

export interface StyleInfo {
  name: string;
  layout: string;
  font: string;
  display: string;
  displayWeight: number;
  body: string;
  colors: { bg: string; surface: string; text: string; muted: string; accent: string; accentText: string; line: string };
}

/** Стиль варианта для карточек и экрана сборки — с учётом того, что клиент поменял сам. */
export function describeStyle(spec: SiteSpec): StyleInfo {
  const theme = getTheme(spec.themeId);
  const font = spec.style.display ? DISPLAY_FONTS[spec.style.display] : null;
  return {
    name: theme.name,
    layout: LAYOUT[spec.style.hero ?? heroLayout(theme, spec.heroVariant)],
    font: font?.title ?? fontName(theme.display),
    display: font?.css ?? theme.display,
    displayWeight: font?.weight ?? theme.displayWeight,
    body: theme.body,
    colors: {
      bg: theme.bg,
      surface: theme.surface,
      text: theme.text,
      muted: theme.muted,
      accent: spec.style.accent ?? theme.accent,
      accentText: spec.style.accent ? textOn(spec.style.accent) : theme.accentText,
      line: theme.line,
    },
  };
}

/** Эффекты, которые стоят на сайте сами (почерк сферы и тема), — чтобы в редакторе было видно, что выбрано сейчас. */
export function effectDefaults(spec: SiteSpec): Required<SiteEffects> {
  const theme = getTheme(spec.themeId);
  const sig = SIGNATURES[spec.niche];
  const services = spec.blocks.find((b) => b.type === "services");
  return {
    fx: sig.fx,
    intro: sig.intro,
    motion: theme.motion,
    cursor: sig.cursor,
    fab: sig.fab,
    decor: theme.decor,
    gallery: sig.gallery,
    steps: sig.steps,
    reviews: sig.reviews,
    faq: sig.faq,
    services: (services?.type === "services" && services.style) || theme.serviceStyle,
    cinema: sig.cinema,
    highlight: sig.highlight,
  };
}

export type SectionType = "hero" | Block["type"] | "contacts";

export interface Section {
  type: SectionType;
  /** Якорь на сайте; у первого экрана якоря нет — это верх страницы. */
  anchor: string | null;
  label: string;
  title: string;
}

function blockTitle(block: Block) {
  if (block.type === "strip") return block.quote ?? block.caption ?? block.items?.[0]?.title ?? "";
  if (block.type === "stats") return block.items.map((i) => i.value).join(" · ");
  return block.title;
}

/** Секции сайта по порядку — для схемы на экране сборки и экскурсии. */
export function sections(spec: SiteSpec): Section[] {
  const seen = new Set<string>();
  const list: Section[] = [{ type: "hero", anchor: null, label: "Первый экран", title: spec.hero.title }];
  for (const block of spec.blocks) {
    // Рендерер ставит якорь только первому блоку каждого типа
    const anchor = seen.has(block.type) ? null : block.type;
    seen.add(block.type);
    list.push({
      type: block.type,
      anchor,
      label: block.type === "feature" ? FEATURE_LABEL[block.kind] : BLOCK_LABEL[block.type],
      title: blockTitle(block),
    });
  }
  list.push({ type: "contacts", anchor: "contacts", label: "Контакты", title: spec.contacts.title });
  return list;
}

/** Фото сайта без повторов: первый экран, коллаж, блоки. */
export function photos(spec: SiteSpec, limit = 8) {
  const found = new Set<string>();
  const add = (src?: string) => src && found.add(src);
  add(spec.images.hero);
  spec.images.side.forEach(add);
  for (const block of spec.blocks) {
    if (block.type === "gallery") block.images.forEach((i) => add(i.src));
    if (block.type === "about") add(block.image);
    if (block.type === "services") block.items.forEach((i) => add(i.image));
    if (block.type === "feature") {
      add(block.image);
      block.items.forEach((i) => add(i.image));
    }
    if (block.type === "team") block.people.forEach((p) => add(p.photo));
  }
  return [...found].slice(0, limit);
}

export interface BuildShowData {
  name: string;
  city: string;
  services: number;
  style: StyleInfo;
  hero: { eyebrow: string; title: string; accent?: string; cta: string };
  sections: Section[];
  photos: string[];
  booking: string[];
  feature?: string;
}

export function buildShow(spec: SiteSpec, servicesCount: number): BuildShowData {
  const feature = spec.blocks.find((b) => b.type === "feature");
  return {
    name: spec.business.name,
    city: spec.business.city,
    services: servicesCount,
    style: describeStyle(spec),
    hero: { eyebrow: spec.hero.eyebrow, title: spec.hero.title, accent: spec.hero.accent, cta: spec.hero.cta },
    sections: sections(spec),
    photos: photos(spec),
    booking: SIGNATURES[spec.niche].booking.steps.map((s) => s.title),
    feature: feature?.type === "feature" ? FEATURE_LABEL[feature.kind] : undefined,
  };
}

export interface TourStep {
  /** Якорь секции на сайте; null — верх страницы. */
  anchor: string | null;
  title: string;
  text: string;
  /** booking — открыть окно записи, phone — показать на телефоне, final — итог с оплатой. */
  action?: "booking" | "phone" | "final";
}

/**
 * Экскурсия по сайту в кабинете: что на каком блоке и зачем он клиенту.
 * aboutFromBrief — клиент рассказал о себе в брифе (иначе текст «О нас» написали мы).
 */
export function tourSteps(spec: SiteSpec, { aboutFromBrief }: { aboutFromBrief: boolean }): TourStep[] {
  const steps: TourStep[] = [
    {
      anchor: null,
      title: "Первый экран",
      text: `Название, главный заголовок и кнопка «${spec.hero.cta}». За пару секунд понятно, чем вы занимаетесь и как к вам попасть.`,
    },
  ];
  const feature = spec.blocks.find((b) => b.type === "feature");
  if (feature?.type === "feature") {
    steps.push({ anchor: "feature", title: `Фишка сайта: ${FEATURE_LABEL[feature.kind].toLowerCase()}`, text: FEATURE_TEXT[feature.kind] });
  }
  const services = spec.blocks.find((b) => b.type === "services");
  if (services?.type === "services") {
    steps.push({
      anchor: "services",
      title: "Услуги и цены",
      text: `${services.items.length} ${plural(services.items.length, "позиция", "позиции", "позиций")} из брифа с ценами. Поменять или добавить услугу можно в правках.`,
    });
  }
  if (spec.blocks.some((b) => b.type === "about")) {
    steps.push({
      anchor: "about",
      title: "О вас",
      text: aboutFromBrief
        ? "Текст собран из того, что вы рассказали в брифе. Хотите добавить подробностей — напишите в правках."
        : "Текст мы написали за вас. Расскажите о себе в правках, и он станет живее.",
    });
  }
  if (spec.blocks.some((b) => b.type === "gallery")) {
    steps.push({
      anchor: "gallery",
      title: "Галерея",
      text: "Пока здесь фото из нашей библиотеки. Пришлите свои, и перед публикацией мы их заменим.",
    });
  }
  const booking = SIGNATURES[spec.niche].booking;
  steps.push({
    anchor: null,
    title: "Онлайн-запись",
    text: `Любая кнопка «${spec.hero.cta}» открывает окно по шагам: ${booking.steps.map((s) => s.title.toLowerCase()).join(" → ")}. Клиенту не нужно звонить.`,
    action: "booking",
  });
  steps.push({
    anchor: "contacts",
    title: "Контакты",
    text: [
      `Телефон ${spec.contacts.phone}`,
      spec.contacts.address && `адрес ${spec.contacts.address}`,
      spec.contacts.hours && `часы работы`,
    ]
      .filter(Boolean)
      .join(", ")
      .concat(". С телефона номер набирается одним касанием."),
  });
  steps.push({
    anchor: null,
    title: "На телефоне",
    text: "Больше половины посетителей придут с телефона. Сайт перестраивается под маленький экран, а кнопка записи всегда под рукой.",
    action: "phone",
  });
  steps.push({
    anchor: null,
    title: "Нравится?",
    text: "Оплатите, и мы опубликуем сайт в течение 24 часов. Если что-то не так, соберите другой вариант или напишите правки.",
    action: "final",
  });
  return steps;
}
