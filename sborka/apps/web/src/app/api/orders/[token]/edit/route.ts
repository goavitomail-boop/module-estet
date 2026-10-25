import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, isEditable, readJson } from "@/lib/http";
import { notifyOwner, photoLibrary, rebuildVersions, siteSpec, snapshot } from "@/lib/orders";
import { blockKeys, CustomSchema, FieldPath, HIDEABLE, PhotoUrl, type Hideable } from "@/lib/sites/customize";
import { isScene } from "@/lib/sites/effects";
import { BriefSchema, EffectsSchema, StyleSchema } from "@/lib/sites/schema";
import { store, type Order } from "@/lib/store";

const brief = BriefSchema.shape;
const custom = CustomSchema.shape;

/**
 * Правки клиента из кабинета и прямо на сайте. Применяются сразу,
 * не тратят бесплатные правки и запоминаются для «Отменить».
 */
const Body = z.discriminatedUnion("section", [
  z.object({ section: z.literal("services"), services: brief.services }),
  z.object({
    section: z.literal("texts"),
    businessName: brief.businessName,
    city: brief.city,
    about: brief.about,
    hero: custom.hero,
  }),
  z.object({ section: z.literal("contacts"), phone: brief.phone, address: brief.address, hours: brief.hours }),
  z.object({ section: z.literal("blocks"), hidden: custom.hidden }),
  z.object({ section: z.literal("team"), team: custom.team }),
  z.object({ section: z.literal("reviews"), reviews: custom.reviews }),
  z.object({ section: z.literal("stats"), stats: custom.stats }),
  // Прямо на сайте
  z.object({ section: z.literal("text"), path: FieldPath, value: z.string().trim().max(600, "Не длиннее 600 символов") }),
  z.object({ section: z.literal("image"), path: FieldPath, src: z.union([PhotoUrl, z.literal("")]) }),
  z.object({ section: z.literal("move"), key: z.string().max(40), dir: z.enum(["up", "down"]) }),
  z.object({ section: z.literal("hide"), key: z.string().max(40) }),
  z.object({ section: z.literal("style"), style: StyleSchema }),
  z.object({ section: z.literal("effects"), effects: EffectsSchema }),
]);
type Edit = z.infer<typeof Body>;

/** Свои тексты первого экрана из формы хранятся там же, где правки на сайте. */
const HERO_FIELDS = ["title", "subtitle", "cta"] as const;

function apply(order: Order, data: Edit): string | null {
  const b = order.brief;
  const c = order.custom;
  switch (data.section) {
    case "services":
      b.services = data.services;
      break;
    case "texts":
      Object.assign(b, { businessName: data.businessName, city: data.city, about: data.about });
      for (const f of HERO_FIELDS) {
        const value = data.hero[f]?.trim();
        if (value) c.texts[`hero.${f}`] = value;
        else delete c.texts[`hero.${f}`];
      }
      c.hero = {};
      break;
    case "contacts":
      Object.assign(b, { phone: data.phone, address: data.address, hours: data.hours });
      break;
    case "blocks":
      c.hidden = data.hidden;
      break;
    case "team":
      c.team = data.team;
      break;
    case "reviews":
      c.reviews = data.reviews;
      break;
    case "stats":
      c.stats = data.stats;
      break;
    case "text":
      if (data.value) c.texts[data.path] = data.value;
      else delete c.texts[data.path];
      if (data.path.startsWith("hero.")) delete c.hero[data.path.slice(5) as (typeof HERO_FIELDS)[number]];
      break;
    case "image":
      if (data.src && !photoLibrary(order).includes(data.src)) return "Такого фото нет в библиотеке";
      if (data.src) c.images[data.path] = data.src;
      else delete c.images[data.path];
      break;
    case "move": {
      const keys = blockKeys(siteSpec(order).blocks);
      const i = keys.indexOf(data.key);
      const j = data.dir === "up" ? i - 1 : i + 1;
      if (i === -1 || j < 0 || j >= keys.length) return "Этот блок дальше не сдвинуть";
      [keys[i], keys[j]] = [keys[j], keys[i]];
      c.order = keys;
      break;
    }
    case "hide": {
      const spec = siteSpec(order);
      const block = spec.blocks[blockKeys(spec.blocks).indexOf(data.key)];
      if (!block) return "Блок не найден";
      // Платную фишку убираем из заказа, свою фишку сферы и блоки шаблона — скрываем
      const addon = order.addons.find((a) => a.id === data.key);
      if (addon) order.addons = order.addons.filter((a) => a !== addon);
      else if ((HIDEABLE as readonly string[]).includes(block.type)) c.hidden = [...new Set([...c.hidden, block.type as Hideable])];
      else return "Этот блок нужен всегда";
      break;
    }
    case "style":
      c.style = data.style;
      break;
    case "effects": {
      c.effects = data.effects;
      // 3D-сцена — платное дополнение: выбрали сцену — добавляем в заказ, убрали — снимаем
      const has3d = order.addons.some((a) => a.id === "scene3d");
      if (isScene(data.effects.fx) && !has3d) order.addons = [...order.addons, { id: "scene3d" }];
      if (!isScene(data.effects.fx) && has3d) order.addons = order.addons.filter((a) => a.id !== "scene3d");
      break;
    }
  }
  return null;
}

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const body = Body.safeParse(await readJson(req));
  if (!body.success) {
    const issue = body.error.issues[0];
    return NextResponse.json({ error: issue?.message ?? "Проверьте поля", path: issue?.path }, { status: 422 });
  }
  const order = await store.findOrderByToken(token);
  if (!order) return fail("Заказ не найден", 404);
  if (!isEditable(order)) return fail("Оплаченный сайт уже не меняется через кабинет", 409);

  // Сначала применяем к копии: так видно, поменялись ли ответы брифа
  const next = structuredClone(order);
  const error = apply(next, body.data);
  if (error) return fail(error, 409);
  const briefChanged = JSON.stringify(next.brief) !== JSON.stringify(order.brief);
  const versions = briefChanged ? await rebuildVersions(next.brief, order.versions) : order.versions;

  const updated = await store.updateOrder(token, (o) => {
    o.history = snapshot(o);
    o.brief = next.brief;
    o.custom = next.custom;
    o.addons = next.addons;
    o.versions = versions;
    o.rev += 1;
  });
  if (!["text", "image", "move", "style", "effects"].includes(body.data.section)) {
    notifyOwner(`Заказ ${next.brief.businessName}: клиент изменил «${body.data.section}»`);
  }
  return NextResponse.json({ rev: updated?.rev, canUndo: (updated?.history.length ?? 0) > 0 });
}
