import { nicheImage } from "./images";
import { NICHES } from "./niches";
import { SiteSpecSchema, type Brief, type NicheId, type SiteSpec } from "./schema";

export interface GenerateInput {
  brief: Brief;
  /** Номер варианта: 0 — основной, дальше — альтернативные. */
  variant: number;
  /** Пример для портфолио: добавляются отзывы, команда, цифры и тарифы вымышленной компании. */
  demo?: boolean;
}

/**
 * Источник сайтов. Сейчас — шаблонный генератор без ИИ.
 * ИИ-провайдер (YandexGPT, Claude) реализует тот же интерфейс и возвращает
 * SiteSpec по той же схеме, поэтому остальной код не меняется.
 */
export interface SiteGenerator {
  readonly name: string;
  generate(input: GenerateInput): Promise<SiteSpec>;
}

/**
 * Ссылки вида «@service-1» в шаблоне заменяются на фото ниши из public/images/niches.
 * «@gallery-1|hero» — сначала gallery-1, если его нет, то hero.
 * Если фото нет, поле убирается и рендерер рисует заглушку.
 */
function resolveImages<T>(value: T, niche: NicheId): T {
  if (typeof value === "string") {
    if (!value.startsWith("@")) return value;
    for (const slot of value.slice(1).split("|")) {
      const found = nicheImage(niche, slot);
      if (found) return found as T;
    }
    return undefined as T;
  }
  if (Array.isArray(value)) return value.map((v) => resolveImages(v, niche)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveImages(v, niche)])) as T;
  }
  return value;
}

export class TemplateGenerator implements SiteGenerator {
  readonly name = "template";

  async generate({ brief, variant, demo = false }: GenerateInput): Promise<SiteSpec> {
    const niche = NICHES[brief.niche];
    const copy = resolveImages(niche.build(brief, { demo }), niche.id);
    return SiteSpecSchema.parse({
      niche: niche.id,
      themeId: niche.themes[variant % 2],
      heroVariant: Math.floor(variant / 2) % 2 === 0 ? "split" : "stacked",
      images: { hero: nicheImage(niche.id, "hero") },
      ...copy,
    });
  }
}

export function getGenerator(): SiteGenerator {
  return new TemplateGenerator();
}
