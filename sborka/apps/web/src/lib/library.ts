import manifest from "./library.json";
import type { NicheId } from "./sites/schema";

/**
 * Библиотека фото для сайтов клиентов: категории со снимками под лицензией CC0
 * (собирает scripts/photo-library.mjs, авторы — в public/library/SOURCES.md).
 */

export interface LibraryPhoto {
  src: string;
  /** Миниатюра для выбора: в библиотеке своя, у загрузок клиента — само фото. */
  thumb: string;
}

export interface PhotoGroup {
  id: string;
  label: string;
  photos: LibraryPhoto[];
}

const CATEGORIES: PhotoGroup[] = manifest.categories.map((c) => ({
  id: c.id,
  label: c.label,
  photos: c.photos.map((p) => ({ src: p.src, thumb: p.thumb })),
}));

const ALL = new Set(CATEGORIES.flatMap((c) => c.photos.map((p) => p.src)));

/** Категории библиотеки: категория сферы клиента — первой. */
export function libraryFor(niche: NicheId): PhotoGroup[] {
  const own = CATEGORIES.find((c) => c.id === niche);
  return own ? [own, ...CATEGORIES.filter((c) => c !== own)] : CATEGORIES;
}

export function isLibraryPhoto(src: string) {
  return ALL.has(src);
}
