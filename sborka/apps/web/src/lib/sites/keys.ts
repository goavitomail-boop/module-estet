import type { Block } from "./schema";

/** Блоки, которые клиент может убрать. Услуги и контакты остаются всегда. */
export const HIDEABLE = ["feature", "strip", "steps", "gallery", "about", "schedule", "cta", "faq", "team", "reviews", "stats"] as const;
export type Hideable = (typeof HIDEABLE)[number];

/**
 * Ключ блока — стабильное имя для правок: «faq», «gallery», «feature-quiz».
 * Повторы того же вида получают номер: «strip-2».
 */
export function blockKeys(blocks: Block[]) {
  const seen = new Map<string, number>();
  return blocks.map((b) => {
    const base = b.type === "feature" ? `feature-${b.kind}` : b.type;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  });
}
