import Script from 'next/script'
import { SiteChrome } from '@/components/site-chrome'
import { preconnect } from 'react-dom'
import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Oswald, Roboto, Marck_Script } from 'next/font/google'
import { defaultOgImage, siteUrl } from '@/lib/seo'
import { COMPANY, KITCHEN_PRICE } from '@/lib/company'
import { preloaderFlagScript } from '@/lib/preloader-flag'
import { consentFlagScript } from '@/lib/consent'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600'],
  variable: '--font-cormorant',
})

const oswald = Oswald({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-oswald',
})

const roboto = Roboto({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-roboto',
})

const marckScript = Marck_Script({
  subsets: ['latin', 'cyrillic'],
  weight: '400',
  variable: '--font-marck',
})

// В заголовке — то, что люди набирают в поиске: «кухни на заказ» и регион.
// Название компании стоит вторым: по нему сайт найдут и так
const title = 'Кухни на заказ в Москве и Московской области — «Модуль Эстет»'
const description =
  `Кухни и шкафы на заказ в Москве и области со своей фабрики: ${KITCHEN_PRICE}, изготовление за ${COMPANY.productionTime}. Бесплатный замер, доставка и монтаж под ключ.`

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: title, template: '%s | Модуль Эстет' },
  description,
  applicationName: 'Модуль Эстет',
  alternates: { canonical: '/' },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    shortcut: '/icon.svg',
    apple: '/apple-icon.png',
  },
  // Без этого блока ссылка на сайт в мессенджерах приходит голым адресом
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: siteUrl,
    siteName: 'Кухни «Модуль Эстет»',
    title,
    description,
    images: [
      {
        url: defaultOgImage,
        width: 1200,
        height: 630,
        alt: 'Кухня на заказ от «Модуль Эстет»',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: [defaultOgImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  // Коды подтверждения прав в Яндекс.Вебмастере и Google Search Console.
  // Задаются переменными окружения, чтобы не держать их в коде.
  verification: {
    ...(process.env.NEXT_PUBLIC_YANDEX_VERIFICATION
      ? { yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION }
      : {}),
    ...(process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION
      ? { google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION }
      : {}),
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#1a1a1a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Соединение с Метрикой — заранее: её скрипт грузится сразу после страницы,
  // и рукопожатие с mc.yandex.ru иначе стоит ~0,7 с на медленной сети
  preconnect('https://mc.yandex.ru')
  return (
    <html lang="ru" className="bg-background" suppressHydrationWarning>
      <body
        className={`${cormorant.variable} ${oswald.variable} ${roboto.variable} ${marckScript.variable} antialiased`}
      >
        {/*
          Ставит класс до первой отрисовки: под ним CSS прячет всё, что потом
          покажет GSAP. Без него был бы кадр, где секции уже видны, а следом
          скрипт их прячет — содержимое моргало бы.

          Скрипт молчит при prefers-reduced-motion и сам снимает класс через
          2,5 секунды, если анимации почему-то не поднялись: страница без
          JavaScript и страница с упавшим JavaScript должны читаться обе.

          Место важно: тег между <html> и <body> React считает ошибкой
          разметки и ругается на несовпадение при гидратации.
        */}
        <Script id="anim-flag" strategy="beforeInteractive">
          {`(function(){try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;var d=document.documentElement;d.classList.add('js-anim');setTimeout(function(){if(!d.dataset.animReady)d.classList.remove('js-anim')},2500)}catch(e){}})()`}
        </Script>
        {/* Заставка закрывает страницу с первой отрисовки, а не после того,
            как React её оживит, — иначе сайт на секунду мелькает */}
        <Script id="preloader-flag" strategy="beforeInteractive">
          {preloaderFlagScript}
        </Script>
        {/* Выбор про куки уже сделан — баннер спрятан с первого кадра */}
        <Script id="consent-flag" strategy="beforeInteractive">
          {consentFlagScript}
        </Script>
        <SiteChrome slot="preloader" />
        <div id="site-content">{children}</div>
        <SiteChrome slot="widget" />
      </body>
    </html>
  )
}
