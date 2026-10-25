import { NextResponse } from "next/server";
import { z } from "zod";
import { AddonSelectionSchema } from "@/lib/addons";
import { fail, readJson } from "@/lib/http";
import { cleanAddons } from "@/lib/orders";
import { customize, EMPTY_CUSTOM, HIDEABLE } from "@/lib/sites/customize";
import { getGenerator } from "@/lib/sites/generator";
import { NICHES } from "@/lib/sites/niches";
import { BriefSchema } from "@/lib/sites/schema";

const Body = z.object({
  brief: BriefSchema,
  style: z.number().int().min(0).max(3).default(0),
  hidden: z.array(z.enum(HIDEABLE)).default([]),
  addons: z.array(AddonSelectionSchema).max(20).default([]),
});

/**
 * Живое превью в брифе: собирает сайт тем же генератором, что и заказ, но ничего не сохраняет.
 * Бриф может быть заполнен не до конца — пустые поля клиент подменяет подсказками.
 */
export async function POST(req: Request) {
  const body = Body.safeParse(await readJson(req));
  if (!body.success) return fail("Не хватает данных для превью", 422);
  const { brief, style, hidden, addons } = body.data;
  const spec = await getGenerator().generate({ brief, variant: style % NICHES[brief.niche].themes.length });
  const site = customize(spec, { custom: { ...EMPTY_CUSTOM, hidden }, addons: cleanAddons(addons, spec), services: brief.services });
  return NextResponse.json({ spec: site });
}
