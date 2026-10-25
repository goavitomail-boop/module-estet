import { NextResponse } from "next/server";
import { fail, isEditable } from "@/lib/http";
import { rebuildVersions } from "@/lib/orders";
import { store } from "@/lib/store";

/** «Отменить»: возвращает ответы брифа, настройки и дополнения к состоянию до последней правки. */
export async function POST(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const order = await store.findOrderByToken(token);
  if (!order) return fail("Заказ не найден", 404);
  if (!isEditable(order)) return fail("Оплаченный сайт уже не меняется через кабинет", 409);
  const prev = order.history.at(-1);
  if (!prev) return fail("Отменять нечего", 409);

  const briefChanged = JSON.stringify(prev.brief) !== JSON.stringify(order.brief);
  const versions = briefChanged ? await rebuildVersions(prev.brief, order.versions) : order.versions;
  const updated = await store.updateOrder(token, (o) => {
    o.history = o.history.slice(0, -1);
    o.brief = prev.brief;
    o.custom = prev.custom;
    // Правка могла добавить 3D-графику или убрать платную фишку — возвращаем и состав заказа
    if (prev.addons) o.addons = prev.addons;
    o.versions = versions;
    o.rev += 1;
  });
  return NextResponse.json({ rev: updated?.rev, canUndo: (updated?.history.length ?? 0) > 0 });
}
