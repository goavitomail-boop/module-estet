import { NextResponse } from "next/server";
import { fail, readJson } from "@/lib/http";
import { createOrder } from "@/lib/orders";
import { BriefSchema } from "@/lib/sites/schema";

export async function POST(req: Request) {
  const parsed = BriefSchema.safeParse(await readJson(req));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Проверьте поля брифа", issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })) },
      { status: 422 },
    );
  }
  const order = await createOrder(parsed.data);
  return NextResponse.json({ token: order.token }, { status: 201 });
}

export function GET() {
  return fail("Метод не поддерживается", 405);
}
