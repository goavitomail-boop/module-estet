/**
 * Палитра живых фонов из цветов сайта: акцент, фон, текст и производные оттенки.
 * Тёмный вариант — на тёмных сайтах и поверх фото (там текст светлый), светлый — пастельный,
 * чтобы тёмный текст оставался читаемым.
 */

type RGB = [number, number, number];

const hex = (c: string): RGB => {
  const m = c.trim().replace("#", "");
  const full = m.length === 3 ? m.replace(/./g, (x) => x + x) : m.slice(0, 6);
  const n = parseInt(full, 16);
  return Number.isNaN(n) ? [0, 0, 0] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const toHex = ([r, g, b]: RGB, a = 1) =>
  "#" +
  [r, g, b, ...(a < 1 ? [Math.round(a * 255)] : [])]
    .map((v) =>
      Math.round(Math.min(255, Math.max(0, v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");

function rgbToHsl([r, g, b]: RGB): RGB {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb([h, s, l]: RGB): RGB {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

const luminance = ([r, g, b]: RGB) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

export interface Palette {
  /** Тёмная палитра: фон тёмный, акценты светятся. */
  dark: boolean;
  accent: string;
  bg: string;
  text: string;
  /** Смешать два цвета: t = 0 — первый, 1 — второй. */
  mix: (a: string, b: string, t: number) => string;
  /** Тот же цвет с прозрачностью. */
  alpha: (c: string, a: number) => string;
  /** Сдвинуть оттенок на deg градусов и поправить насыщенность и светлоту. */
  shift: (c: string, deg: number, sat?: number, light?: number) => string;
  /** Фон для шейдера: на тёмной палитре — фон сайта или почти чёрный, на светлой — фон сайта. */
  base: string;
  /** Оттенки акцента от глубокого к светлому — для градиентов. */
  ramp: string[];
}

export function makePalette(accent: string, bg: string, text: string, dark: boolean): Palette {
  const mix = (a: string, b: string, t: number) => {
    const x = hex(a);
    const y = hex(b);
    return toHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
  };
  const alpha = (c: string, a: number) => toHex(hex(c), a);
  const shift = (c: string, deg: number, sat = 0, light = 0) => {
    const [h, s, l] = rgbToHsl(hex(c));
    return toHex(hslToRgb([(h + deg + 360) % 360, Math.min(1, Math.max(0, s + sat)), Math.min(0.97, Math.max(0.03, l + light))]));
  };
  const siteDark = luminance(hex(bg)) < 0.5;
  // Поверх фото на светлом сайте фон шейдера свой, тёмный
  const base = dark ? (siteDark ? bg : mix(accent, "#05060a", 0.86)) : bg;
  const ramp = dark
    ? [mix(accent, base, 0.75), mix(accent, base, 0.4), accent, shift(accent, 18, 0.05, 0.12), mix(accent, "#ffffff", 0.55)]
    : [mix(accent, bg, 0.88), mix(accent, bg, 0.7), mix(accent, bg, 0.45), shift(accent, -16, 0, 0.12), accent];
  return { dark, accent, bg, text, mix, alpha, shift, base, ramp };
}
