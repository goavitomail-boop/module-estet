import { z } from "zod";
import { FEATURE_ADDONS, type AddonSelection } from "../addons";
import { photos } from "./presentation";
import type { Block, BlockInput, Brief, SiteSpec } from "./schema";
import { BlockSchema } from "./schema";

/**
 * Настройки клиента поверх собранного сайта: что скрыть, свои тексты первого экрана,
 * команда, отзывы и цифры, платные фишки. Применяются к любому варианту,
 * поэтому правки не теряются при переключении вариантов.
 */

/** Блоки шаблона, которые клиент может убрать. Услуги и контакты остаются всегда. */
export const HIDEABLE = ["feature", "strip", "steps", "gallery", "about", "schedule", "cta", "faq"] as const;
export type Hideable = (typeof HIDEABLE)[number];

const text = (max: number) => z.string().trim().max(max, `Не длиннее ${max} символов`);

export const CustomSchema = z.object({
  hidden: z.array(z.enum(HIDEABLE)).default([]),
  hero: z
    .object({
      title: text(120).optional(),
      subtitle: text(240).optional(),
      cta: text(30).optional(),
    })
    .default({}),
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

export function customize(spec: SiteSpec, { custom, addons, services }: { custom: Custom; addons: AddonSelection[]; services: Brief["services"] }): SiteSpec {
  const hero = {
    ...spec.hero,
    ...(custom.hero.title ? { title: custom.hero.title, accent: undefined } : {}),
    ...(custom.hero.subtitle ? { subtitle: custom.hero.subtitle } : {}),
    ...(custom.hero.cta ? { cta: custom.hero.cta } : {}),
  };
  const blocks = spec.blocks.filter((b) => !(HIDEABLE as readonly string[]).includes(b.type) || !custom.hidden.includes(b.type as Hideable));

  if (custom.team.length && !blocks.some((b) => b.type === "team")) {
    insert(blocks, BlockSchema.parse({ type: "team", eyebrow: "Команда", title: "Кто будет с вами работать", people: custom.team }), RANK.team);
  }
  if (custom.stats.length && !blocks.some((b) => b.type === "stats")) {
    insert(blocks, BlockSchema.parse({ type: "stats", items: custom.stats }), RANK.stats);
  }
  if (custom.reviews.length && !blocks.some((b) => b.type === "reviews")) {
    insert(blocks, BlockSchema.parse({ type: "reviews", eyebrow: "Отзывы", title: "Что говорят клиенты", items: custom.reviews }), RANK.reviews);
  }
  for (const sel of addons) {
    if (!(sel.id in FEATURE_ADDONS)) continue;
    const id = sel.id as keyof typeof FEATURE_ADDONS;
    // Своя фишка сферы уже на сайте — второй такой же блок не нужен
    if (blocks.some((b) => b.type === "feature" && b.kind === FEATURE_ADDONS[id])) continue;
    insert(blocks, BlockSchema.parse(featureBlock(id, spec, services)), RANK[id]);
  }
  return { ...spec, hero, blocks };
}
