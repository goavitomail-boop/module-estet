import { NextResponse } from "next/server";
import type { Order } from "./store";

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

/** Сайт можно менять, пока заказ не оплачен. */
export function isEditable(order: Order) {
  return order.status === "ready" || order.status === "payment_pending";
}
