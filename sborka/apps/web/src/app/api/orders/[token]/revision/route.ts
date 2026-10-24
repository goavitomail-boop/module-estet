import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, isEditable, readJson } from "@/lib/http";
import { notifyOwner, revisionsLeft } from "@/lib/orders";
import { store } from "@/lib/store";

const Body = z.object({
  text: z.string().trim().min(3, "Опишите, что изменить").max(1000, "Не длиннее 1000 символов"),
});

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const body = Body.safeParse(await readJson(req));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Опишите, что изменить", 422);
  const order = await store.findOrderByToken(token);
  if (!order) return fail("Заказ не найден", 404);
  if (!isEditable(order)) return fail("Оплаченный сайт уже не меняется через кабинет", 409);
  if (revisionsLeft(order) === 0) return fail("Бесплатные правки закончились", 409);

  // Пока правки вносит человек; с подключением ИИ они будут применяться автоматически.
  const revision = { id: randomUUID(), text: body.data.text, createdAt: new Date().toISOString(), status: "pending" as const };
  await store.updateOrder(token, (o) => {
    o.revisions.push(revision);
  });
  notifyOwner(`Правка к заказу ${order.brief.businessName}: ${revision.text}`);
  return NextResponse.json({ revision }, { status: 201 });
}
