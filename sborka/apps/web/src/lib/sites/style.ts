/**
 * Настройки внешнего вида, которые клиент меняет сам поверх темы:
 * акцентный цвет, шрифт заголовков, скругления, композиция первого экрана.
 * Только проверенные варианты, чтобы сайт нельзя было «сломать».
 */

export const DISPLAY_FONTS = {
  playfair: { title: "Playfair Display", mood: "элегантный", css: "'Playfair Display Variable', Georgia, serif", weight: 600 },
  cormorant: { title: "Cormorant", mood: "утончённый", css: "'Cormorant Garamond Variable', Georgia, serif", weight: 500 },
  lora: { title: "Lora", mood: "мягкий", css: "'Lora Variable', Georgia, serif", weight: 500 },
  oswald: { title: "Oswald", mood: "строгий", css: "'Oswald Variable', 'Arial Narrow', sans-serif", weight: 600 },
  unbounded: { title: "Unbounded", mood: "смелый", css: "'Unbounded Variable', system-ui, sans-serif", weight: 700 },
  rubik: { title: "Rubik", mood: "дружелюбный", css: "'Rubik Variable', system-ui, sans-serif", weight: 700 },
  onest: { title: "Onest", mood: "современный", css: "'Onest Variable', system-ui, sans-serif", weight: 600 },
  golos: { title: "Golos", mood: "спокойный", css: "'Golos Text Variable', system-ui, sans-serif", weight: 600 },
} as const;
export type DisplayFont = keyof typeof DISPLAY_FONTS;

export const RADII = {
  sharp: { title: "Строгие", value: "2px" },
  soft: { title: "Мягкие", value: "12px" },
  round: { title: "Круглые", value: "999px" },
} as const;
export type Radius = keyof typeof RADII;

export const HERO_LAYOUTS = {
  split: "Фото справа",
  overlay: "Фото на весь экран",
  centered: "Заголовок по центру",
  editorial: "Журнальный",
  collage: "Коллаж из фото",
} as const;

/** Акцентные цвета, которые хорошо смотрятся и на светлом, и на тёмном фоне. */
export const ACCENTS = ["#C8873E", "#A84E62", "#D21F17", "#FF5A1F", "#E9A55B", "#3F6B41", "#0B7C7E", "#2F55D4", "#7C5CFF", "#151515"];

export type HeroLayoutId = keyof typeof HERO_LAYOUTS;

export interface SiteStyle {
  accent?: string;
  display?: DisplayFont;
  radius?: Radius;
  hero?: HeroLayoutId;
}

/** Цвет текста на кнопке акцентного цвета: белый или почти чёрный — что читается лучше. */
export function textOn(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.4 ? "#111111" : "#ffffff";
}
