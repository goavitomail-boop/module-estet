import { NextResponse } from "next/server";
import { fail, isEditable } from "@/lib/http";
import { variantsLeft } from "@/lib/orders";
import { getGenerator } from "@/lib/sites/generator";
import { store } from "@/lib/store";

export async function POST(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const order = await store.findOrderByToken(token);
  if (!order) return fail("Заказ не найден", 404);
  if (!isEditable(order)) return fail("Оплаченный сайт уже не меняется через кабинет", 409);
  if (variantsLeft(order) === 0) return fail("Бесплатные варианты закончились", 409);

  const variant = Math.max(...order.versions.map((v) => v.variant)) + 1;
  const spec = await getGenerator().generate({ brief: order.brief, variant });
  const updated = await store.updateOrder(token, (o) => {
    const n = Math.max(...o.versions.map((v) => v.n)) + 1;
    o.versions.push({ n, variant, spec, createdAt: new Date().toISOString(), reason: "variant" });
    o.currentVersion = n;
  });
  return NextResponse.json({ currentVersion: updated?.currentVersion });
}
