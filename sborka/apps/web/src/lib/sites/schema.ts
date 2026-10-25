import { z } from "zod";

export const NICHE_IDS = ["nails", "repair", "auto", "psychologist", "coffee"] as const;
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
] as const;
export const IconSchema = z.enum(ICON_NAMES);
export type IconName = (typeof ICON_NAMES)[number];

/**
 * Описание собранного сайта. Это то, что вернёт ИИ (или шаблонный генератор);
 * рендерер превращает его в страницу.
 */
export const SiteSpecSchema = z.object({
  niche: z.enum(NICHE_IDS),
  themeId: z.string(),
  heroVariant: z.enum(["split", "stacked"]),
  /** Фото для первого экрана и блока «о нас». Без них рисуется абстрактная композиция. */
  images: z.object({ hero: z.string().optional(), about: z.string().optional() }).default({}),
  business: z.object({
    name: z.string(),
    city: z.string(),
    /** Подпись под логотипом. */
    tagline: z.string().default(""),
    logoIcon: IconSchema.default("sparkle"),
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
  services: z.object({
    eyebrow: z.string().default(""),
    title: z.string(),
    lead: z.string().default(""),
    items: z.array(
      z.object({
        name: z.string(),
        price: z.string(),
        note: z.string().optional(),
        image: z.string().optional(),
        icon: IconSchema.optional(),
      }),
    ),
  }),
  /** Полоса между услугами и остальными блоками: цитата или ряд преимуществ. */
  strip: z
    .object({
      quote: z.string().optional(),
      caption: z.string().optional(),
      items: z.array(z.object({ icon: IconSchema, title: z.string(), text: z.string() })).optional(),
    })
    .default({}),
  about: z.object({ title: z.string(), text: z.string() }),
  reasons: z.object({
    title: z.string(),
    items: z.array(z.object({ title: z.string(), text: z.string() })),
  }),
  faq: z.object({
    title: z.string(),
    items: z.array(z.object({ q: z.string(), a: z.string() })),
  }),
  contacts: z.object({
    title: z.string(),
    phone: z.string(),
    address: z.string(),
    hours: z.string(),
    formCta: z.string(),
  }),
});
export type SiteSpec = z.infer<typeof SiteSpecSchema>;
export type SiteSpecInput = z.input<typeof SiteSpecSchema>;
