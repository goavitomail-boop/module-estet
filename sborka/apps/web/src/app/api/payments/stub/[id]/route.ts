import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, readJson } from "@/lib/http";
import { notifyOwner } from "@/lib/orders";
import { store } from "@/lib/store";

const Body = z.object({ action: z.enum(["succeed", "cancel"]) });

/** Имитация вебхука платёжной системы для тестовой оплаты. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if ((process.env.PAYMENT_PROVIDER ?? "stub") !== "stub") return fail("Тестовая оплата отключена", 404);
  const { id } = await ctx.params;
  const body = Body.safeParse(await readJson(req));
  if (!body.success) return fail("Неизвестное действие");

  const payment = await store.findPayment(id);
  if (!payment) return fail("Платёж не найден", 404);
  if (payment.status !== "pending") return fail("Платёж уже обработан", 409);

  const result = await store.setPaymentStatus(id, body.data.action === "succeed" ? "succeeded" : "canceled");
  if (!result?.order) return fail("Заказ не найден", 404);
  if (body.data.action === "succeed") notifyOwner(`Оплачен заказ ${result.order.brief.businessName}`);
  return NextResponse.json({ redirect: `/order/${result.order.token}` });
}
