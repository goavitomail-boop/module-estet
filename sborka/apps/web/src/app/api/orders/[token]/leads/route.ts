import { NextResponse } from "next/server";
import { LeadsSchema } from "@/lib/addons";
import { fail, readJson } from "@/lib/http";
import { store } from "@/lib/store";

/** Куда присылать заявки. Можно менять и после оплаты. */
export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const body = LeadsSchema.safeParse(await readJson(req));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Проверьте поля", 422);
  const updated = await store.updateOrder(token, (o) => {
    o.leads = body.data;
  });
  if (!updated) return fail("Заказ не найден", 404);
  return NextResponse.json({ leads: updated.leads });
}
