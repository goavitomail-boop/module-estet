import type { Metadata } from 'next'
import { COMPANY } from '@/lib/company'
import { faqItems } from '@/lib/faq-data'

export const siteUrl = 'https://module-estet.ru'
export const businessName = 'Модуль Эстет'
export const businessPhone = '+7 925 340-12-11'
export const businessPhoneRaw = '+79253401211'

/**
 * Картинка по умолчанию для превью ссылок в мессенджерах и соцсетях.
 * Именно JPG и именно 1200×630: часть соцсетей не показывает webp, а другой
 * размер обрезают как придётся
 */
export const defaultOgImage = '/images/og-cover.jpg'

/* ──────────────────────── Метаданные страниц ──────────────────────── */

/**
 * Собирает метаданные страницы: канонический адрес и превью ссылки.
 *
 * Заголовок передаётся БЕЗ хвоста «| Модуль Эстет» — его добавляет шаблон
 * title.template из корневого layout. Иначе хвост задваивается.
 */
export function pageMetadata({
  title,
  description,
  path,
  image = defaultOgImage,
  noIndex = false,
}: {
  title: string
  description: string
  path: string
  image?: string
  noIndex?: boolean
}): Metadata {
  const url = `${siteUrl}${path}`

  return {
    title,
    description,
    alternates: { canonical: path },
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: 'website',
      locale: 'ru_RU',
      url,
      siteName: `Кухни «${businessName}»`,
      title: `${title} | ${businessName}`,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${businessName}`,
      description,
      images: [image],
    },
  }
}

/* ──────────────────────── Структурированные данные ──────────────────────── */

export const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${siteUrl}/#website`,
  url: siteUrl,
  name: businessName,
  inLanguage: 'ru-RU',
  publisher: { '@id': `${siteUrl}/#business` },
}

/** Услуги, которые компания оказывает — попадают в карточку организации */
const services = [
  { name: 'Дизайн-проект кухни на дому', description: 'Выезд дизайнера, подбор материалов и цветовых решений под ваш интерьер.' },
  { name: 'Замер помещения', description: 'Точный замер с учётом коммуникаций, ниш и особенностей планировки.' },
  { name: 'Расчёт стоимости кухни', description: 'Прозрачная смета без скрытых доплат, стоимость фиксируется в договоре.' },
  { name: 'Изготовление кухни на заказ', description: 'Собственное производство кухонь любой сложности, включая нестандартные размеры.' },
  { name: 'Доставка кухни', description: 'Аккуратная доставка и подъём на этаж в удобное время.' },
  { name: 'Монтаж кухни', description: 'Профессиональная установка с проверкой фасадов и механизмов.' },
  { name: 'Гарантийное обслуживание', description: 'Гарантия по договору, регулировка и сервисная поддержка после установки.' },
]

export const businessJsonLd = {
  '@context': 'https://schema.org',
  '@type': ['HomeAndConstructionBusiness', 'LocalBusiness'],
  '@id': `${siteUrl}/#business`,
  name: businessName,
  alternateName: `Кухни «${businessName}»`,
  legalName: COMPANY.legalName,
  url: siteUrl,
  telephone: businessPhoneRaw,
  image: `${siteUrl}${defaultOgImage}`,
  logo: `${siteUrl}/brand/logo-mark.svg`,
  description: 'Проектирование, изготовление, доставка и монтаж кухонь на заказ в Москве и Московской области.',
  currenciesAccepted: 'RUB',
  paymentAccepted: 'Наличные, банковская карта, безналичный расчёт',
  ...(COMPANY.inn ? { taxID: COMPANY.inn } : {}),
  ...(COMPANY.ogrnip
    ? { identifier: { '@type': 'PropertyValue', propertyID: 'ОГРНИП', value: COMPANY.ogrnip } }
    : {}),
  ...(COMPANY.address
    ? { address: { '@type': 'PostalAddress', addressCountry: 'RU', addressLocality: 'Москва', streetAddress: COMPANY.address } }
    : { address: { '@type': 'PostalAddress', addressCountry: 'RU', addressLocality: 'Москва' } }),
  ...(COMPANY.email ? { email: COMPANY.email } : {}),
  areaServed: [
    { '@type': 'City', name: 'Москва' },
    { '@type': 'AdministrativeArea', name: 'Московская область' },
  ],
  priceRange: '$$',
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: businessPhoneRaw,
    contactType: 'sales',
    areaServed: 'RU',
    availableLanguage: 'Russian',
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '09:00',
      closes: '21:00',
    },
  ],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Услуги «Модуль Эстет»',
    itemListElement: services.map((service) => ({
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: service.name,
        description: service.description,
        provider: { '@id': `${siteUrl}/#business` },
        areaServed: ['Москва', 'Московская область'],
      },
    })),
  },
}

/** Разметка блока «Частые вопросы» — источник тот же, что и на странице */
export const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  '@id': `${siteUrl}/#faq`,
  mainEntity: faqItems.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: { '@type': 'Answer', text: item.answer },
  })),
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${siteUrl}${item.path}`,
    })),
  }
}

/** Карточка обычной внутренней страницы */
export function webPageJsonLd({ name, description, path }: { name: string; description: string; path: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${siteUrl}${path}#webpage`,
    url: `${siteUrl}${path}`,
    name,
    description,
    inLanguage: 'ru-RU',
    isPartOf: { '@id': `${siteUrl}/#website` },
    about: { '@id': `${siteUrl}/#business` },
  }
}
