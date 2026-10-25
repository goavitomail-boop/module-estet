import type { BlockInput, Brief, IconName, NicheId, SiteSpecInput } from "../schema";

export type Copy = Omit<SiteSpecInput, "niche" | "themeId" | "heroVariant" | "images">;
export type Service = Brief["services"][number];

export interface BuildOptions {
  /**
   * Пример для портфолио (вымышленная компания). Только в примерах выводятся
   * отзывы, команда, цифры и тарифы: для реального клиента их не придумываем.
   */
  demo: boolean;
}

export interface Niche {
  id: NicheId;
  /** Название сферы в брифе и на лендинге. */
  label: string;
  /** Пара тем: основная и альтернативная (для «другого варианта»). */
  themes: [string, string];
  /** Демо-бизнес для портфолио. Вымышленный, подписывается как пример. */
  demo: Omit<Brief, "niche">;
  /** Подсказки для полей брифа. */
  placeholders: { businessName: string; about: string };
  build: (brief: Brief, options: BuildOptions) => Copy;
}

/** Добавляет к услугам описания (если услуга типовая), иконки и фото по порядку. */
export function services(items: Service[], notes: Record<string, string>, icons: IconName[]) {
  return items.map((s, i) => ({
    ...s,
    note: notes[s.name],
    icon: icons[i % icons.length],
    image: `@service-${i + 1}`,
  }));
}

/** Блоки, которые выводятся только в примерах. */
export function demoOnly(options: BuildOptions, ...blocks: BlockInput[]): BlockInput[] {
  return options.demo ? blocks : [];
}

/** Контакты из брифа. */
export function contacts(b: Brief, title: string, formCta: string) {
  return { title, phone: b.phone, address: b.address, hours: b.hours, formCta };
}
