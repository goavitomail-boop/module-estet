import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { AddonSelectionSchema, ADDONS, LeadsSchema, quote, type AddonSelection } from "./addons";
import { isLibraryPhoto, libraryFor, type PhotoGroup } from "./library";
import { availableAddons } from "./sites/catalog";
import { CustomSchema, customize, HIDEABLE } from "./sites/customize";
import { getGenerator } from "./sites/generator";
import { nichePhotos } from "./sites/images";
import { NICHES } from "./sites/niches";
import { BriefSchema, SiteSpecSchema, type Brief, type SiteSpec } from "./sites/schema";
import { store, type Order } from "./store";

export const LIMITS = {
  /** Бесплатные альтернативные варианты сверх первого. */
  extraVariants: 2,
  /** Бесплатные правки. */
  revisions: 3,
};

/** Что приходит из брифа: ответы о бизнесе, выбранный стиль, лишние блоки, дополнения и куда слать заявки. */
export const NewOrderSchema = z
  .object({
    brief: BriefSchema,
    style: z.number().int().min(0).max(3).default(0),
    hidden: z.array(z.enum(HIDEABLE)).default([]),
    addons: z.array(AddonSelectionSchema).max(20).default([]),
    leads: LeadsSchema,
  })
  .superRefine((v, ctx) => {
    // Для «Другой сферы» без описания текстам не из чего собраться
    if (v.brief.niche === "other" && v.brief.kind.length < 2) {
      ctx.addIssue({ code: "custom", path: ["brief", "kind"], message: "Напишите, чем вы занимаетесь" });
    }
  });
export type NewOrder = z.infer<typeof NewOrderSchema>;

/** Своя фишка сферы в собранном сайте. */
function ownFeature(spec: SiteSpec) {
  const feature = spec.blocks.find((b) => b.type === "feature");
  return feature?.type === "feature" ? feature.kind : undefined;
}

/**
 * Оставляет только доступные сфере дополнения, по одному каждого вида,
 * с допустимым количеством и вариантом. Цена всегда считается на сервере.
 */
export function cleanAddons(list: AddonSelection[], spec: SiteSpec): AddonSelection[] {
  const allowed = new Set(availableAddons(ownFeature(spec)));
  const seen = new Set<string>();
  const out: AddonSelection[] = [];
  for (const sel of list) {
    if (!allowed.has(sel.id) || seen.has(sel.id)) continue;
    seen.add(sel.id);
    const addon = ADDONS[sel.id];
    const option = addon.options?.some((o) => o.id === sel.option) ? sel.option : addon.options?.[0].id;
    out.push({ id: sel.id, ...(addon.maxQty ? { qty: Math.min(addon.maxQty, sel.qty ?? 1) } : {}), ...(option ? { option } : {}) });
  }
  return out;
}

export async function createOrder(input: NewOrder): Promise<Order> {
  const { brief } = input;
  const style = input.style % NICHES[brief.niche].themes.length;
  const spec = await getGenerator().generate({ brief, variant: style });
  const now = new Date().toISOString();
  const order: Order = {
    id: randomUUID(),
    token: randomBytes(18).toString("base64url"),
    createdAt: now,
    status: "ready",
    brief,
    versions: [{ n: 1, variant: style, spec, createdAt: now, reason: "brief" }],
    currentVersion: 1,
    revisions: [],
    custom: CustomSchema.parse({ hidden: input.hidden }),
    addons: cleanAddons(input.addons, spec),
    leads: input.leads,
    wishes: [],
    uploads: [],
    history: [],
    rev: 0,
  };
  await store.insertOrder(order);
  const total = quote(order.addons).total;
  notifyOwner(`Новый заказ: ${brief.businessName} (${brief.city}), ${total.toLocaleString("ru-RU")} ₽`);
  return order;
}

export function variantsLeft(order: Order) {
  const used = order.versions.filter((v) => v.reason === "variant").length;
  return Math.max(0, LIMITS.extraVariants - used);
}

export function revisionsLeft(order: Order) {
  return Math.max(0, LIMITS.revisions - order.revisions.length);
}

function findVersion(order: Order, n?: number) {
  return order.versions.find((v) => v.n === (n ?? order.currentVersion)) ?? order.versions.at(-1)!;
}

/** Сайт, собранный генератором, — без настроек клиента. */
export function baseSpec(order: Order, n?: number) {
  return SiteSpecSchema.parse(findVersion(order, n).spec);
}

/** Сайт, который видит клиент: вариант плюс его настройки и фишки. */
export function siteSpec(order: Order, n?: number): SiteSpec {
  return customize(baseSpec(order, n), { custom: order.custom, addons: order.addons, services: order.brief.services });
}

/** Сумма к оплате и разбивка. */
export function orderQuote(order: Order) {
  return quote(order.addons);
}

/**
 * Пересобирает все варианты после изменения ответов брифа.
 * Шаблонный генератор детерминирован, поэтому вид вариантов сохраняется.
 */
export async function rebuildVersions(brief: Brief, versions: Order["versions"]) {
  const generator = getGenerator();
  return Promise.all(versions.map(async (v) => ({ ...v, spec: await generator.generate({ brief, variant: v.variant }) })));
}

/**
 * Уведомление владельцу о событиях по заказам.
 * Пока пишет в лог сервера; позже — Telegram-бот.
 */
export function notifyOwner(message: string) {
  console.info(`[сборка] ${message}`);
}

/** Фото, из которых клиент может выбирать: его загрузки, фото шаблона его сферы и общая библиотека по категориям. */
export function photoLibrary(order: Order): PhotoGroup[] {
  const own = (list: string[]) => list.map((src) => ({ src, thumb: src }));
  return [
    { id: "uploads", label: "Ваши фото", photos: own(order.uploads) },
    { id: "template", label: "Из шаблона", photos: own(nichePhotos(order.brief.niche)) },
    ...libraryFor(order.brief.niche),
  ].filter((g) => g.photos.length > 0);
}

/** Можно ли поставить это фото на сайт: только загрузки клиента и фото из библиотек. */
export function canUsePhoto(order: Order, src: string) {
  return order.uploads.includes(src) || nichePhotos(order.brief.niche).includes(src) || isLibraryPhoto(src);
}

/** Запоминает состояние перед правкой, чтобы её можно было отменить. */
export function snapshot(order: Order) {
  return [
    ...order.history,
    { brief: structuredClone(order.brief), custom: structuredClone(order.custom), addons: structuredClone(order.addons) },
  ].slice(-20);
}
