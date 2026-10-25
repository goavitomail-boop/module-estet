import { existsSync } from "node:fs";
import path from "node:path";
import type { NicheId } from "./schema";

const DIR = path.join(process.cwd(), "public", "images", "niches");
const EXT = ["webp", "jpg", "jpeg", "png"];

/** Публичный путь к фото ниши, если файл загружен (например, coffee-hero.jpg). */
export function nicheImage(niche: NicheId, slot: "hero" | "about"): string | undefined {
  for (const ext of EXT) {
    const file = `${niche}-${slot}.${ext}`;
    if (existsSync(path.join(DIR, file))) return `/images/niches/${file}`;
  }
  return undefined;
}
