import { promises as fs } from "node:fs";
import { UPLOADS_DIR } from "@/lib/uploads";

/** Отдаёт загруженное фото. Имена проверяем строго, чтобы нельзя было выйти за папку. */
export async function GET(_req: Request, ctx: { params: Promise<{ order: string; file: string }> }) {
  const { order, file } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(order) || !/^[0-9a-f-]{36}\.webp$/.test(file)) return new Response("Не найдено", { status: 404 });
  try {
    const data = await fs.readFile(`${UPLOADS_DIR}/${order}/${file}`);
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Не найдено", { status: 404 });
  }
}
