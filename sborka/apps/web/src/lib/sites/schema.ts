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

/**
 * Описание собранного сайта. Это то, что вернёт ИИ (или шаблонный генератор);
 * рендерер превращает его в страницу.
 */
export const SiteSpecSchema = z.object({
  niche: z.enum(NICHE_IDS),
  themeId: z.string(),
  heroVariant: z.enum(["split", "stacked"]),
  business: z.object({ name: z.string(), city: z.string() }),
  hero: z.object({ title: z.string(), subtitle: z.string(), cta: z.string() }),
  services: z.object({
    title: z.string(),
    items: z.array(z.object({ name: z.string(), price: z.string() })),
  }),
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
