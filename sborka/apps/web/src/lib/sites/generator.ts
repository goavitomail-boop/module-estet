import { nicheImage } from "./images";
import { NICHES } from "./niches";
import { SiteSpecSchema, type Brief, type SiteSpec } from "./schema";

export interface GenerateInput {
  brief: Brief;
  /** Номер варианта: 0 — основной, дальше — альтернативные. */
  variant: number;
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

export class TemplateGenerator implements SiteGenerator {
  readonly name = "template";

  async generate({ brief, variant }: GenerateInput): Promise<SiteSpec> {
    const niche = NICHES[brief.niche];
    const copy = niche.build(brief);
    // Фото услуг подставляются по порядку: первые услуги ниши совпадают с фото в библиотеке
    copy.services.items = copy.services.items.map((item, i) => ({
      ...item,
      image: item.image ?? nicheImage(niche.id, `service-${i + 1}`),
    }));
    return SiteSpecSchema.parse({
      niche: niche.id,
      themeId: niche.themes[variant % 2],
      heroVariant: Math.floor(variant / 2) % 2 === 0 ? "split" : "stacked",
      images: { hero: nicheImage(niche.id, "hero"), about: nicheImage(niche.id, "about") },
      ...copy,
    });
  }
}

export function getGenerator(): SiteGenerator {
  return new TemplateGenerator();
}
