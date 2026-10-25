import type { Metadata, Viewport } from "next";
import "@fontsource-variable/onest";
import "@fontsource-variable/manrope";
// Кандидаты на замену шрифтов (временно, см. варианты в globals.css)
import "@fontsource-variable/unbounded";
import "@fontsource-variable/inter-tight";
import "@fontsource-variable/inter";
import "@fontsource-variable/geologica";
import "@fontsource/dela-gothic-one";
import "@fontsource-variable/golos-text";
import "@fontsource/prata";
import "@fontsource-variable/wix-madefor-display";
import "@fontsource-variable/wix-madefor-text";
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

// Предпросмотр шрифтов: ?font=a … ?font=f подставляет вариант до отрисовки страницы
const FONT_PREVIEW = `try{var f=new URLSearchParams(location.search).get('font');if(f)document.documentElement.dataset.font=f}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: FONT_PREVIEW }} />
        {children}
      </body>
    </html>
  );
}
