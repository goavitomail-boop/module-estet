import { ADDON_IDS, FEATURE_ADDONS, type AddonId } from "../addons";
import { HIDEABLE, type Hideable } from "./customize";
import { getGenerator } from "./generator";
import { nicheImage } from "./images";
import { demoBrief, NICHES } from "./niches";
import { describeStyle, FEATURE_LABEL, FEATURE_TEXT, type StyleInfo } from "./presentation";
import { NICHE_IDS, type FeatureKind, type NicheId, type SiteSpec } from "./schema";

/**
 * Что показать клиенту про его сферу в брифе и кабинете: блоки шаблона с объяснением,
 * доступные дополнения и два стиля на выбор. Считается на сервере из шаблонов.
 */

export interface BlockOption {
  type: Hideable;
  label: string;
  why: string;
}

export interface NicheOptions {
  id: NicheId;
  label: string;
  photo?: string;
  /** Блоки шаблона, которые можно убрать. */
  blocks: BlockOption[];
  /** Своя фишка сферы — входит в цену. */
  feature?: FeatureKind;
  /** Дополнения, доступные этой сфере. */
  addons: AddonId[];
  /** Стили на выбор: у сфер с шаблоном — два, у «Другого» — четыре. */
  styles: StyleInfo[];
}

/** Блоки шаблона; команда, отзывы и цифры появляются только из данных клиента. */
type TemplateBlock = Exclude<Hideable, "feature" | "team" | "reviews" | "stats">;

const BLOCK_INFO: Record<TemplateBlock, { label: string; why: string }> = {
  strip: { label: "Лента с девизом", why: "Яркая полоса с короткой фразой о вас: разбивает страницу и запоминается." },
  steps: { label: "Как проходит работа", why: "Шаги от заявки до результата. Снимает вопрос «а что будет дальше?»." },
  gallery: { label: "Фото работ", why: "Показывает результат лучше любых слов. Пока поставим подходящие фото, свои замените позже." },
  about: { label: "О вас", why: "Рассказ о вас и вашем подходе помогает выбрать именно вас." },
  schedule: { label: "Расписание", why: "Занятия по дням недели: не нужно звонить и уточнять." },
  cta: { label: "Призыв записаться", why: "Яркий блок с кнопкой ближе к концу страницы — ещё один повод записаться." },
  faq: { label: "Частые вопросы", why: "Отвечает на вопросы до звонка: сколько длится, сколько стоит, можно ли без записи." },
};

/** Что всегда есть на сайте и не убирается. */
export const ALWAYS = [
  { label: "Первый экран и меню", why: "Название, главный заголовок и кнопка записи." },
  { label: "Услуги и цены", why: "Из вашего списка услуг." },
  { label: "Онлайн-запись", why: "Окно записи по шагам на любой кнопке «Записаться»." },
  { label: "Контакты", why: "Телефон, адрес и часы работы; с телефона номер набирается одним касанием." },
];

export function blockOptions(spec: SiteSpec): BlockOption[] {
  const seen = new Set<string>();
  const list: BlockOption[] = [];
  for (const b of spec.blocks) {
    if (!(HIDEABLE as readonly string[]).includes(b.type) || !(b.type === "feature" || b.type in BLOCK_INFO) || seen.has(b.type)) continue;
    seen.add(b.type);
    if (b.type === "feature") list.push({ type: "feature", label: `Фишка: ${FEATURE_LABEL[b.kind].toLowerCase()}`, why: FEATURE_TEXT[b.kind] });
    else list.push({ type: b.type as TemplateBlock, ...BLOCK_INFO[b.type as TemplateBlock] });
  }
  return list;
}

/** Своя фишка сферы: платная фишка того же вида ей не нужна. */
export function availableAddons(feature?: FeatureKind): AddonId[] {
  return ADDON_IDS.filter((id) => !(id in FEATURE_ADDONS) || FEATURE_ADDONS[id as keyof typeof FEATURE_ADDONS] !== feature);
}

export async function nicheOptions(id: NicheId): Promise<NicheOptions> {
  const generator = getGenerator();
  const brief = demoBrief(id);
  const variants = await Promise.all(NICHES[id].themes.map((_, variant) => generator.generate({ brief, variant })));
  const main = variants[0];
  const feature = main.blocks.find((b) => b.type === "feature");
  const kind = feature?.type === "feature" ? feature.kind : undefined;
  return {
    id,
    label: NICHES[id].label,
    photo: nicheImage(id, "hero"),
    blocks: blockOptions(main),
    feature: kind,
    addons: availableAddons(kind),
    styles: variants.map(describeStyle),
  };
}

export async function allNicheOptions() {
  const list = await Promise.all(NICHE_IDS.map(nicheOptions));
  return Object.fromEntries(list.map((o) => [o.id, o])) as Record<NicheId, NicheOptions>;
}
