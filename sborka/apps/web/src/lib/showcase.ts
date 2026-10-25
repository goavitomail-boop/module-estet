import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Фото для тёмной витрины-кофейни на лендинге. Если сгенерированные фото
 * загружены в public/images/showcase, берём их, иначе — фото шаблона кофейни.
 */
const DIR = path.join(process.cwd(), "public", "images", "showcase");

function pick(name: string, fallback: string) {
  for (const ext of ["webp", "jpg", "jpeg", "png"]) {
    if (existsSync(path.join(DIR, `${name}.${ext}`))) return `/images/showcase/${name}.${ext}`;
  }
  return fallback;
}

export interface ShowcasePhotos {
  hero: string;
  drinks: { name: string; price: string; src: string }[];
  interior: string;
}

export function showcasePhotos(): ShowcasePhotos {
  return {
    hero: pick("hero", "/images/niches/coffee-service-1.webp"),
    drinks: [
      { name: "Эспрессо", price: "149 ₽", src: pick("espresso", "/images/niches/coffee-service-1.webp") },
      { name: "Американо", price: "179 ₽", src: pick("americano", "/images/niches/coffee-hero.webp") },
      { name: "Капучино", price: "249 ₽", src: pick("cappuccino", "/images/niches/coffee-service-2.webp") },
      { name: "Латте", price: "269 ₽", src: pick("latte", "/images/niches/coffee-service-3.webp") },
    ],
    interior: pick("interior", "/images/niches/coffee-hero.webp"),
  };
}
