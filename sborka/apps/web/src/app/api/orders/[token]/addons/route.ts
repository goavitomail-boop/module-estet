import { NextResponse } from "next/server";
import { z } from "zod";
import { AddonSelectionSchema } from "@/lib/addons";
import { fail, isEditable, readJson } from "@/lib/http";
import { baseSpec, cleanAddons, orderQuote } from "@/lib/orders";
import { store } from "@/lib/store";

const Body = z.object({ addons: z.array(AddonSelectionSchema).max(20) });

/** Новый список дополнений. Цена пересчитывается на сервере. */
export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const body = Body.safeParse(await readJson(req));
  if (!body.success) return fail("Не получилось разобрать дополнения");
  const order = await store.findOrderByToken(token);
  if (!order) return fail("Заказ не найден", 404);
  if (!isEditable(order)) return fail("Оплаченный заказ уже не меняется через кабинет", 409);

  const addons = cleanAddons(body.data.addons, baseSpec(order));
  const updated = await store.updateOrder(token, (o) => {
    o.addons = addons;
    o.rev += 1;
  });
  return NextResponse.json({ addons, total: updated ? orderQuote(updated).total : null, rev: updated?.rev });
}
