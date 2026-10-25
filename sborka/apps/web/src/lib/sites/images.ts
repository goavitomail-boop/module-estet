import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import type { NicheId } from "./schema";

const DIR = path.join(process.cwd(), "public", "images", "niches");
const EXT = ["webp", "jpg", "jpeg", "png"];

/** Публичный путь к фото ниши, если файл загружен (например, coffee-hero.jpg). */
export function nicheImage(niche: NicheId, slot: string): string | undefined {
  for (const ext of EXT) {
    const file = `${niche}-${slot}.${ext}`;
    if (existsSync(path.join(DIR, file))) return `/images/niches/${file}`;
  }
  return undefined;
}

/** Все фото сферы из библиотеки — для выбора фото в кабинете. */
export function nichePhotos(niche: NicheId): string[] {
  try {
    return readdirSync(DIR)
      .filter((f) => f.startsWith(`${niche}-`) && EXT.some((ext) => f.endsWith(`.${ext}`)))
      .sort()
      .map((f) => `/images/niches/${f}`);
  } catch {
    return [];
  }
}
