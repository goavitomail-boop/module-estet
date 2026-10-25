import { z } from "zod";
import { FEATURE_ADDONS, type AddonSelection } from "../addons";
import { blockKeys, HIDEABLE } from "./keys";
import { photos } from "./presentation";
import type { Block, BlockInput, Brief, SiteSpec } from "./schema";
import { BlockSchema, StyleSchema } from "./schema";

export { blockKeys, HIDEABLE, type Hideable } from "./keys";

/**
 * Настройки клиента поверх собранного сайта: что скрыть, свои тексты и фото,
 * порядок блоков, внешний вид, команда, отзывы, цифры и платные фишки.
 * Применяются к любому варианту, поэтому правки не теряются при смене варианта.
 */

const text = (max: number) => z.string().trim().max(max, `Не длиннее ${max} символов`);

/** Адрес поля на сайте: «hero.title», «faq.items.2.a», «feature-quiz.title». */
export const FieldPath = z.string().regex(/^[a-z][a-z0-9-]*(\.[a-zA-Z0-9]+){1,4}$/, "Неизвестное поле").max(80);

/** Фото — только из нашей библиотеки или загруженные клиентом. */
export const PhotoUrl = z.string().regex(/^\/(images\/niches\/[\w.-]+|api\/uploads\/[\w-]+\/[\w.-]+)$/, "Неизвестное фото");

export const CustomSchema = z.object({
  hidden: z.array(z.enum(HIDEABLE)).default([]),
  /** Тексты первого экрана из вкладки «Изменить» (старый формат; новые правки — в texts). */
  hero: z
    .object({
      title: text(120).optional(),
      subtitle: text(240).optional(),
      cta: text(30).optional(),
    })
    .default({}),
  /** Свои тексты по адресу поля. */
  texts: z.record(FieldPath, text(600)).default({}),
  /** Свои фото по адресу поля. */
  images: z.record(FieldPath, PhotoUrl).default({}),
  /** Порядок блоков — ключи блоков сверху вниз. */
  order: z.array(z.string().max(40)).max(40).default([]),
  style: StyleSchema.default({}),
  team: z
    .array(z.object({ name: text(40).min(1, "Укажите имя"), role: text(60).default("") }))
    .max(8, "Не больше 8 человек")
    .default([]),
  reviews: z
    .array(
      z.object({
        name: text(40).min(1, "Укажите имя"),
        meta: text(60).default(""),
        text: text(400).min(10, "Отзыв слишком короткий"),
      }),
    )
    .max(8, "Не больше 8 отзывов")
    .default([]),
  stats: z
    .array(z.object({ value: text(12).min(1, "Укажите число"), label: text(40).min(1, "Укажите подпись") }))
    .max(4, "Не больше 4 цифр")
    .default([]),
});
export type Custom = z.infer<typeof CustomSchema>;

export const EMPTY_CUSTOM: Custom = CustomSchema.parse({});

/** Порядок блоков на странице: новые блоки встают на своё место, а не в конец. */
const RANK: Record<string, number> = {
  feature: 1,
  services: 2,
  "feature-lookbook": 2.5,
  "feature-menu": 2.6,
  strip: 3,
  schedule: 4,
  gallery: 5,
  steps: 6,
  "feature-quiz": 6.5,
  team: 7,
  about: 8,
  stats: 9,
  reviews: 10,
  pricing: 11,
  "feature-wizard": 11.5,
  cta: 12,
  faq: 13,
};

function insert(blocks: Block[], block: Block, rank: number) {
  const at = blocks.findIndex((b) => (RANK[b.type] ?? 99) > rank);
  if (at === -1) blocks.push(block);
  else blocks.splice(at, 0, block);
}

/** Блок платной фишки из услуг клиента и фото сайта. */
function featureBlock(id: keyof typeof FEATURE_ADDONS, spec: SiteSpec, services: Brief["services"]): BlockInput {
  const pics = photos(spec, 12);
  const items = services.map((s, i) => ({ title: s.name, price: s.price, image: pics.length ? pics[i % pics.length] : undefined }));
  switch (id) {
    case "feature-quiz":
      return {
        type: "feature",
        kind: "quiz",
        eyebrow: "Подбор",
        title: "Подскажем, с чего начать",
        lead: "Три вопроса — и мы посоветуем услугу.",
        items: [
          { title: "Что вас интересует?", text: services.slice(0, 4).map((s) => s.name).join("|") },
          { title: "Когда вам удобнее?", text: "Утром|Днём|Вечером|В выходные" },
          { title: "Вы у нас впервые?", text: "Да, впервые|Уже был(а) у вас" },
        ],
      };
    case "feature-lookbook":
      return { type: "feature", kind: "lookbook", eyebrow: "Прайс", title: "Услуги и работы", lead: "Наведите на услугу — покажем результат.", items };
    case "feature-menu":
      return { type: "feature", kind: "menu", eyebrow: "Витрина", title: "Что мы предлагаем", lead: "", items };
    case "feature-wizard":
      return {
        type: "feature",
        kind: "wizard",
        eyebrow: "Запись",
        title: "Запишитесь прямо здесь",
        lead: "Выберите услугу и время — мы подтвердим запись.",
      };
  }
}

/** Ставит значение по адресу, только если такое поле есть: старые правки не ломают новую структуру. */
function setPath(root: unknown, parts: string[], value: string, allowNew: boolean) {
  let node = root as Record<string, unknown> | unknown[] | undefined;
  for (const part of parts.slice(0, -1)) {
    if (node === null || typeof node !== "object") return;
    node = (node as Record<string, unknown>)[part] as typeof node;
  }
  if (node === null || typeof node !== "object") return;
  const last = parts[parts.length - 1];
  const current = (node as Record<string, unknown>)[last];
  if (typeof current === "string" || (allowNew && current === undefined)) (node as Record<string, unknown>)[last] = value;
}

/** Правки текстов и фото по адресам полей. */
function applyOverrides(spec: SiteSpec, keys: string[], overrides: Record<string, string>, images: boolean) {
  for (const [path, value] of Object.entries(overrides)) {
    const [head, ...rest] = path.split(".");
    if (head === "hero" || head === "contacts" || head === "images") {
      if (head === "hero" && rest[0] === "title" && !images) spec.hero.accent = undefined;
      setPath(spec, [head, ...rest], value, images);
      continue;
    }
    const i = keys.indexOf(head);
    if (i !== -1) setPath(spec.blocks[i], rest, value, images);
  }
}

export function customize(spec: SiteSpec, { custom, addons, services }: { custom: Custom; addons: AddonSelection[]; services: Brief["services"] }): SiteSpec {
  // Глубокая копия: базовый сайт заказа не должен меняться
  const out: SiteSpec = structuredClone(spec);
  out.hero = {
    ...out.hero,
    ...(custom.hero.title ? { title: custom.hero.title, accent: undefined } : {}),
    ...(custom.hero.subtitle ? { subtitle: custom.hero.subtitle } : {}),
    ...(custom.hero.cta ? { cta: custom.hero.cta } : {}),
  };
  const hidden = new Set<string>(custom.hidden);
  let blocks = out.blocks.filter((b) => !hidden.has(b.type));

  if (custom.team.length && !hidden.has("team") && !blocks.some((b) => b.type === "team")) {
    insert(blocks, BlockSchema.parse({ type: "team", eyebrow: "Команда", title: "Кто будет с вами работать", people: custom.team }), RANK.team);
  }
  if (custom.stats.length && !hidden.has("stats") && !blocks.some((b) => b.type === "stats")) {
    insert(blocks, BlockSchema.parse({ type: "stats", items: custom.stats }), RANK.stats);
  }
  if (custom.reviews.length && !hidden.has("reviews") && !blocks.some((b) => b.type === "reviews")) {
    insert(blocks, BlockSchema.parse({ type: "reviews", eyebrow: "Отзывы", title: "Что говорят клиенты", items: custom.reviews }), RANK.reviews);
  }
  for (const sel of addons) {
    if (!(sel.id in FEATURE_ADDONS)) continue;
    const id = sel.id as keyof typeof FEATURE_ADDONS;
    // Своя фишка сферы уже на сайте — второй такой же блок не нужен
    if (blocks.some((b) => b.type === "feature" && b.kind === FEATURE_ADDONS[id])) continue;
    insert(blocks, BlockSchema.parse(featureBlock(id, out, services)), RANK[id]);
  }

  // Порядок, который клиент задал стрелками; новые блоки остаются на своих местах
  if (custom.order.length) {
    const keys = blockKeys(blocks);
    const pos = new Map(custom.order.map((k, i) => [k, i]));
    const placed = blocks.map((b, i) => ({ b, key: keys[i], i }));
    const known = placed.filter((x) => pos.has(x.key)).sort((a, z) => pos.get(a.key)! - pos.get(z.key)!);
    const slots = placed.filter((x) => pos.has(x.key)).map((x) => x.i);
    const result = placed.map((x) => x.b);
    slots.forEach((slot, n) => (result[slot] = known[n].b));
    blocks = result;
  }
  out.blocks = blocks;

  const keys = blockKeys(blocks);
  applyOverrides(out, keys, custom.texts, false);
  applyOverrides(out, keys, custom.images, true);
  out.style = { ...out.style, ...custom.style };
  return out;
}
