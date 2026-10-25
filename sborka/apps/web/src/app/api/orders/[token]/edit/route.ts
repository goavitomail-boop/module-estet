import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, isEditable, readJson } from "@/lib/http";
import { notifyOwner, rebuildVersions } from "@/lib/orders";
import { CustomSchema } from "@/lib/sites/customize";
import { BriefSchema } from "@/lib/sites/schema";
import { store } from "@/lib/store";

const brief = BriefSchema.shape;
const custom = CustomSchema.shape;

/** Быстрые правки из кабинета: применяются сразу, без дизайнера и без счёта правок. */
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
]);

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

  const data = body.data;
  const nextBrief = { ...order.brief };
  const nextCustom = structuredClone(order.custom);
  switch (data.section) {
    case "services":
      nextBrief.services = data.services;
      break;
    case "texts":
      Object.assign(nextBrief, { businessName: data.businessName, city: data.city, about: data.about });
      nextCustom.hero = data.hero;
      break;
    case "contacts":
      Object.assign(nextBrief, { phone: data.phone, address: data.address, hours: data.hours });
      break;
    case "blocks":
      nextCustom.hidden = data.hidden;
      break;
    case "team":
      nextCustom.team = data.team;
      break;
    case "reviews":
      nextCustom.reviews = data.reviews;
      break;
    case "stats":
      nextCustom.stats = data.stats;
      break;
  }
  // Ответы брифа поменялись — пересобираем варианты; настройки поверх сайта применяются сами
  const briefChanged = JSON.stringify(nextBrief) !== JSON.stringify(order.brief);
  const versions = briefChanged ? await rebuildVersions(nextBrief, order.versions) : order.versions;

  const updated = await store.updateOrder(token, (o) => {
    o.brief = nextBrief;
    o.custom = nextCustom;
    o.versions = versions;
    o.rev += 1;
  });
  notifyOwner(`Заказ ${nextBrief.businessName}: клиент изменил «${data.section}»`);
  return NextResponse.json({ rev: updated?.rev });
}
