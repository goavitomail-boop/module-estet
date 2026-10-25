import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getGenerator } from "@/lib/sites/generator";
import { demoBrief } from "@/lib/sites/niches";
import { EffectsSchema, NICHE_IDS, type NicheId } from "@/lib/sites/schema";
import { HERO_LAYOUTS, type HeroLayoutId } from "@/lib/sites/style";
import { SiteRenderer } from "@/sites/SiteRenderer";

export const metadata: Metadata = { title: "Эффекты", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Пример сайта с любым набором эффектов — для записи роликов-примеров в редакторе
 * (scripts/effect-previews.mjs). Работает только с SBORKA_DEV_TOOLS=1.
 * ?niche=florist&v=0&e={"gallery":"polaroid"}&intro=1&h=centered (h — композиция первого экрана)
 */
export default async function EffectsDevPage({
  searchParams,
}: {
  searchParams: Promise<{ niche?: string; v?: string; e?: string; intro?: string; h?: string }>;
}) {
  if (process.env.SBORKA_DEV_TOOLS !== "1") notFound();
  const { niche = "other", v, e, intro, h } = await searchParams;
  if (!NICHE_IDS.includes(niche as NicheId)) notFound();
  const spec = await getGenerator().generate({ brief: demoBrief(niche as NicheId), variant: Number(v) || 0, demo: true });
  let raw: unknown = {};
  try {
    raw = JSON.parse(e ?? "{}");
  } catch {}
  spec.effects = EffectsSchema.parse(raw);
  if (h && h in HERO_LAYOUTS) spec.style = { ...spec.style, hero: h as HeroLayoutId };
  return <SiteRenderer spec={spec} mode="example" intro={intro === "1"} />;
}
