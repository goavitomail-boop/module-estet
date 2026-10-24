import { randomBytes, randomUUID } from "node:crypto";
import { getGenerator } from "./sites/generator";
import type { Brief } from "./sites/schema";
import { store, type Order } from "./store";

export const LIMITS = {
  /** Бесплатные альтернативные варианты сверх первого. */
  extraVariants: 2,
  /** Бесплатные правки. */
  revisions: 3,
};

export async function createOrder(brief: Brief): Promise<Order> {
  const spec = await getGenerator().generate({ brief, variant: 0 });
  const now = new Date().toISOString();
  const order: Order = {
    id: randomUUID(),
    token: randomBytes(18).toString("base64url"),
    createdAt: now,
    status: "ready",
    brief,
    versions: [{ n: 1, variant: 0, spec, createdAt: now, reason: "brief" }],
    currentVersion: 1,
    revisions: [],
  };
  await store.insertOrder(order);
  notifyOwner(`Новый заказ: ${brief.businessName} (${brief.city})`);
  return order;
}

export function variantsLeft(order: Order) {
  const used = order.versions.filter((v) => v.reason === "variant").length;
  return Math.max(0, LIMITS.extraVariants - used);
}

export function revisionsLeft(order: Order) {
  return Math.max(0, LIMITS.revisions - order.revisions.length);
}

export function currentSpec(order: Order) {
  return (order.versions.find((v) => v.n === order.currentVersion) ?? order.versions.at(-1)!).spec;
}

/**
 * Уведомление владельцу о событиях по заказам.
 * Пока пишет в лог сервера; позже — Telegram-бот.
 */
export function notifyOwner(message: string) {
  console.info(`[сборка] ${message}`);
}
