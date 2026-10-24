import { NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { getPaymentProvider } from "@/lib/payments";
import { store } from "@/lib/store";

export async function POST(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const order = await store.findOrderByToken(token);
  if (!order) return fail("Заказ не найден", 404);
  if (order.status === "paid" || order.status === "published") return fail("Заказ уже оплачен", 409);

  const payment = await getPaymentProvider().createPayment(order);
  return NextResponse.json({ confirmationUrl: payment.confirmationUrl });
}
