import { z } from "zod";
import { DISPLAY_FONTS, HERO_LAYOUTS, RADII, type DisplayFont, type HeroLayoutId, type Radius } from "./style";

export const NICHE_IDS = [
  "coffee",
  "nails",
  "repair",
  "auto",
  "psychologist",
  "fitness",
  "legal",
  "barber",
  "cleaning",
  "dental",
  "photo",
  "florist",
] as const;
export type NicheId = (typeof NICHE_IDS)[number];

export const ServiceSchema = z.object({
  name: z.string().trim().min(1, "Укажите название услуги").max(60, "Не длиннее 60 символов"),
  price: z.string().trim().max(30, "Не длиннее 30 символов"),
});

/** Ответы клиента из брифа. */
export const BriefSchema = z.object({
  niche: z.enum(NICHE_IDS, { error: "Выберите сферу бизнеса" }),
  businessName: z.string().trim().min(2, "Укажите название").max(60, "Не длиннее 60 символов"),
  city: z.string().trim().min(2, "Укажите город").max(40, "Не длиннее 40 символов"),
  about: z.string().trim().max(600, "Не длиннее 600 символов").default(""),
  services: z.array(ServiceSchema).min(1, "Добавьте хотя бы одну услугу").max(12, "Не больше 12 услуг"),
  phone: z
    .string()
    .trim()
    .min(5, "Укажите телефон")
    .max(30, "Слишком длинный номер")
    .regex(/^[+\d\s()-]+$/, "Только цифры, пробелы, скобки и +"),
  address: z.string().trim().max(120, "Не длиннее 120 символов").default(""),
  hours: z.string().trim().max(80, "Не длиннее 80 символов").default(""),
  wishes: z.string().trim().max(1000, "Не длиннее 1000 символов").default(""),
});
export type Brief = z.infer<typeof BriefSchema>;
export type BriefInput = z.input<typeof BriefSchema>;

export const ICON_NAMES = [
  "leaf", "heart", "calendar", "shield", "clock", "users", "doc", "camera", "sprout", "armchair", "bean", "cup",
  "wrench", "gear", "car", "oil", "laptop", "tire", "ruler", "home", "sparkle", "lock", "phone", "pin", "arrow", "plus",
  "chat", "eye", "card", "globe", "bolt", "play", "check", "layers", "mobile", "palette", "text",
  "dumbbell", "scale", "scissors", "spray", "tooth", "aperture", "flower", "star", "briefcase", "fire", "drop", "gift",
] as const;
export const IconSchema = z.enum(ICON_NAMES);
export type IconName = (typeof ICON_NAMES)[number];

export const FEATURE_KINDS = [
  "menu",
  "palette",
  "calculator",
  "hotspots",
  "breathe",
  "quiz",
  "navigator",
  "lookbook",
  "wipe",
  "wizard",
  "postcard",
] as const;
export type FeatureKind = (typeof FEATURE_KINDS)[number];

const Title = {
  eyebrow: z.string().default(""),
  title: z.string(),
  lead: z.string().default(""),
};

export const ServiceItemSchema = z.object({
  name: z.string(),
  price: z.string(),
  note: z.string().optional(),
  image: z.string().optional(),
  icon: IconSchema.optional(),
});

/**
 * Блоки страницы. Сайт — это первый экран, список блоков в нужном порядке и контакты.
 * ИИ (или шаблон ниши) выбирает блоки и заполняет их.
 */
export const BlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("services"),
    ...Title,
    /** Вид карточек; по умолчанию — из темы. */
    style: z.enum(["photo", "arch", "icon", "list"]).optional(),
    items: z.array(ServiceItemSchema),
  }),
  z.object({
    type: z.literal("strip"),
    quote: z.string().optional(),
    caption: z.string().optional(),
    items: z.array(z.object({ icon: IconSchema, title: z.string(), text: z.string() })).optional(),
  }),
  z.object({
    type: z.literal("about"),
    title: z.string(),
    text: z.string(),
    image: z.string().optional(),
    points: z.array(z.object({ title: z.string(), text: z.string() })).default([]),
  }),
  z.object({
    type: z.literal("gallery"),
    ...Title,
    images: z.array(z.object({ src: z.string().optional(), caption: z.string().optional() })),
  }),
  z.object({
    type: z.literal("steps"),
    ...Title,
    items: z.array(z.object({ title: z.string(), text: z.string() })),
  }),
  z.object({
    type: z.literal("team"),
    ...Title,
    people: z.array(z.object({ name: z.string(), role: z.string(), photo: z.string().optional() })),
  }),
  z.object({
    type: z.literal("reviews"),
    ...Title,
    items: z.array(z.object({ name: z.string(), meta: z.string().default(""), text: z.string() })),
  }),
  z.object({
    type: z.literal("pricing"),
    ...Title,
    plans: z.array(
      z.object({
        name: z.string(),
        price: z.string(),
        period: z.string().default(""),
        features: z.array(z.string()),
        featured: z.boolean().default(false),
      }),
    ),
  }),
  z.object({
    type: z.literal("stats"),
    items: z.array(z.object({ value: z.string(), label: z.string() })),
  }),
  z.object({
    type: z.literal("schedule"),
    ...Title,
    days: z.array(z.object({ day: z.string(), items: z.array(z.object({ time: z.string(), name: z.string() })) })),
  }),
  z.object({
    type: z.literal("cta"),
    title: z.string(),
    text: z.string().default(""),
    button: z.string(),
  }),
  z.object({
    type: z.literal("faq"),
    title: z.string(),
    items: z.array(z.object({ q: z.string(), a: z.string() })),
  }),
  /**
   * Интерактивный блок — «фишка» сайта: витрина меню, подбор оттенка, калькулятор,
   * точки на фото, дыхательная практика, тест, навигатор по ситуациям, лукбук,
   * «протрите стекло», запись по шагам, открытка к букету.
   */
  z.object({
    type: z.literal("feature"),
    kind: z.enum(FEATURE_KINDS),
    ...Title,
    image: z.string().optional(),
    items: z
      .array(
        z.object({
          title: z.string(),
          text: z.string().optional(),
          price: z.string().optional(),
          /** Число для расчёта: цена за м², длительность и т. п. */
          value: z.number().optional(),
          color: z.string().optional(),
          image: z.string().optional(),
          /** Положение точки на фото, в процентах. */
          x: z.number().optional(),
          y: z.number().optional(),
        }),
      )
      .default([]),
  }),
]);
export type Block = z.infer<typeof BlockSchema>;
export type BlockInput = z.input<typeof BlockSchema>;
export type BlockType = Block["type"];

/** Прототипы, сохранённые до появления блоков, переводятся в новый формат. */
function legacyToBlocks(raw: unknown) {
  if (!raw || typeof raw !== "object" || "blocks" in raw) return raw;
  const old = raw as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const blocks: unknown[] = [];
  if (old.services) blocks.push({ type: "services", ...old.services });
  if (old.strip && (old.strip.quote || old.strip.items)) blocks.push({ type: "strip", ...old.strip });
  if (old.about)
    blocks.push({ type: "about", ...old.about, image: old.images?.about, points: old.reasons?.items ?? [] });
  if (old.faq) blocks.push({ type: "faq", ...old.faq });
  return { ...old, blocks };
}

/** Внешний вид, который клиент меняет сам: только проверенные варианты из style.ts. */
export const StyleSchema = z.object({
  accent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Цвет в формате #RRGGBB")
    .optional(),
  display: z.enum(Object.keys(DISPLAY_FONTS) as [DisplayFont, ...DisplayFont[]]).optional(),
  radius: z.enum(Object.keys(RADII) as [Radius, ...Radius[]]).optional(),
  hero: z.enum(Object.keys(HERO_LAYOUTS) as [HeroLayoutId, ...HeroLayoutId[]]).optional(),
});

/**
 * Описание собранного сайта. Это то, что вернёт ИИ (или шаблонный генератор);
 * рендерер превращает его в страницу.
 */
const SiteSpecObject = z.object({
    niche: z.enum(NICHE_IDS),
    themeId: z.string(),
    heroVariant: z.enum(["split", "stacked"]),
    /** Что клиент поменял во внешнем виде сам: акцент, шрифт, скругления, первый экран. */
    style: StyleSchema.default({}),
    /**
     * Фото первого экрана. Без него рисуется абстрактная композиция.
     * side — дополнительные фото для коллажа в первом экране.
     */
    images: z.object({ hero: z.string().optional(), side: z.array(z.string()).default([]) }).default({ side: [] }),
    business: z.object({
      name: z.string(),
      city: z.string(),
      /** Подпись под логотипом. */
      tagline: z.string().default(""),
      logoIcon: IconSchema.default("sparkle"),
      /** Обязательная пометка (например, для медицинских услуг). Выводится в подвале. */
      disclaimer: z.string().optional(),
    }),
    hero: z.object({
      eyebrow: z.string().default(""),
      title: z.string(),
      /** Часть заголовка, выделенная акцентным цветом. */
      accent: z.string().optional(),
      subtitle: z.string(),
      cta: z.string(),
      features: z.array(z.object({ icon: IconSchema, text: z.string() })).default([]),
    }),
    blocks: z.array(BlockSchema),
    contacts: z.object({
      title: z.string(),
      phone: z.string(),
      address: z.string(),
      hours: z.string(),
      formCta: z.string(),
    }),
});
export const SiteSpecSchema = z.preprocess(legacyToBlocks, SiteSpecObject);
export type SiteSpec = z.infer<typeof SiteSpecObject>;
export type SiteSpecInput = z.input<typeof SiteSpecObject>;
