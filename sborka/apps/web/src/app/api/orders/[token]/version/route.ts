import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, isEditable, readJson } from "@/lib/http";
import { store } from "@/lib/store";

const Body = z.object({ n: z.number().int().positive() });

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const body = Body.safeParse(await readJson(req));
  if (!body.success) return fail("Не указана версия");
  const order = await store.findOrderByToken(token);
  if (!order) return fail("Заказ не найден", 404);
  if (!isEditable(order)) return fail("Оплаченный сайт уже не меняется через кабинет", 409);
  if (!order.versions.some((v) => v.n === body.data.n)) return fail("Такой версии нет", 404);

  await store.updateOrder(token, (o) => {
    o.currentVersion = body.data.n;
  });
  return NextResponse.json({ currentVersion: body.data.n });
}
