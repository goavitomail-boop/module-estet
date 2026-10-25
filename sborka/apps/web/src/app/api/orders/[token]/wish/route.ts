import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, readJson } from "@/lib/http";
import { notifyOwner } from "@/lib/orders";
import { store } from "@/lib/store";

const Body = z.object({
  text: z.string().trim().min(5, "Опишите, что нужно").max(1000, "Не длиннее 1000 символов"),
});

/** «Не нашли нужное?» — оцениваем вручную и отвечаем клиенту. */
export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const body = Body.safeParse(await readJson(req));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Опишите, что нужно", 422);
  const wish = { id: randomUUID(), text: body.data.text, createdAt: new Date().toISOString(), status: "new" as const };
  const updated = await store.updateOrder(token, (o) => {
    o.wishes.push(wish);
  });
  if (!updated) return fail("Заказ не найден", 404);
  notifyOwner(`Запрос на доработку от ${updated.brief.businessName}: ${wish.text}`);
  return NextResponse.json({ wish }, { status: 201 });
}
