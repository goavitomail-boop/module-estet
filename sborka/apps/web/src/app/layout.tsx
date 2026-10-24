import type { Metadata, Viewport } from "next";
import "@fontsource-variable/unbounded";
import "@fontsource-variable/manrope";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Сборка — сайт за 24 часа за 4 999 ₽",
    template: "%s — Сборка",
  },
  description:
    "Опишите бизнес, и ИИ соберёт сайт из блоков, сделанных дизайнерами. Посмотрите прототип и платите, только если понравится.",
  openGraph: {
    title: "Сборка — сайт за 24 часа за 4 999 ₽",
    description: "ИИ собирает сайт по вашему брифу. Оплата только после просмотра.",
    locale: "ru_RU",
    type: "website",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0D",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
