import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { fail, isEditable } from "@/lib/http";
import { store } from "@/lib/store";
import { UPLOADS_DIR } from "@/lib/uploads";

const MAX_BYTES = 12 * 1024 * 1024;
const MAX_UPLOADS = 40;

/**
 * Фото клиента: уменьшаем до 1800 px по большей стороне и сохраняем в WebP —
 * сайт остаётся лёгким, даже если прислали снимок с телефона на 10 МБ.
 */
export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const order = await store.findOrderByToken(token);
  if (!order) return fail("Заказ не найден", 404);
  if (!isEditable(order)) return fail("Оплаченный сайт уже не меняется через кабинет", 409);
  if (order.uploads.length >= MAX_UPLOADS) return fail(`Можно загрузить до ${MAX_UPLOADS} фото`, 409);

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail("Выберите фото");
  if (!file.type.startsWith("image/")) return fail("Это не фото. Подойдут JPG, PNG, WebP или HEIC");
  if (file.size > MAX_BYTES) return fail("Фото больше 12 МБ — выберите поменьше");

  let image: Buffer;
  try {
    image = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    return fail("Не получилось открыть фото. Попробуйте JPG или PNG");
  }
  const name = `${randomUUID()}.webp`;
  const dir = `${UPLOADS_DIR}/${order.id}`;
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(`${dir}/${name}`, image);

  const url = `/api/uploads/${order.id}/${name}`;
  await store.updateOrder(token, (o) => {
    o.uploads = [url, ...o.uploads];
  });
  return NextResponse.json({ url }, { status: 201 });
}
