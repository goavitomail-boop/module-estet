import { NextResponse } from "next/server";
import { fail, readJson } from "@/lib/http";
import { createOrder, NewOrderSchema } from "@/lib/orders";

export async function POST(req: Request) {
  const parsed = NewOrderSchema.safeParse(await readJson(req));
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
