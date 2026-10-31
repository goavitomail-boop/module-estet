import type { Metadata } from 'next'
import { COMPANY, KITCHEN_PRICE } from '@/lib/company'
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
  { name: 'Модульные шкафы на заказ', description: 'Гардеробные и шкафы для гостиной, спальни и прихожей по размерам помещения: семь коллекций фасадов, витрины и наполнение.' },
  { name: 'Доставка кухни', description: 'Аккуратная доставка и подъём на этаж в удобное время.' },
  { name: 'Монтаж кухни', description: 'Профессиональная установка с проверкой фасадов и механизмов.' },
  { name: 'Гарантийное обслуживание', description: 'Гарантия по договору, регулировка и сервисная поддержка после установки.' },
]

/** Профиль в MAX — единственная соцсеть компании, связывает сайт и аккаунт */
export const maxProfileUrl = 'https://web.max.ru/93711404'

export const businessJsonLd = {
  '@context': 'https://schema.org',
  // FurnitureStore Яндекс Бизнес поддерживает явно; HomeAndConstructionBusiness
  // оставлен для Google — производство и монтаж, а не только продажа
  '@type': ['FurnitureStore', 'HomeAndConstructionBusiness'],
  '@id': `${siteUrl}/#business`,
  name: businessName,
  alternateName: `Кухни «${businessName}»`,
  legalName: COMPANY.legalName,
  url: siteUrl,
  telephone: businessPhoneRaw,
  image: `${siteUrl}${defaultOgImage}`,
  logo: `${siteUrl}/brand/logo-mark.svg`,
  description: 'Проектирование, изготовление, доставка и монтаж кухонь и модульных шкафов на заказ в Москве и Московской области.',
  currenciesAccepted: 'RUB',
  ...(COMPANY.inn ? { taxID: COMPANY.inn } : {}),
  ...(COMPANY.ogrnip
    ? { identifier: { '@type': 'PropertyValue', propertyID: 'ОГРНИП', value: COMPANY.ogrnip } }
    : {}),
  ...(COMPANY.address
    ? { address: { '@type': 'PostalAddress', addressCountry: 'RU', addressRegion: 'Московская область', streetAddress: COMPANY.address } }
    : { address: { '@type': 'PostalAddress', addressCountry: 'RU', addressRegion: 'Москва и Московская область' } }),
  ...(COMPANY.email ? { email: COMPANY.email } : {}),
  areaServed: [
    { '@type': 'City', name: 'Москва' },
    { '@type': 'AdministrativeArea', name: 'Московская область' },
  ],
  priceRange: `Кухни ${KITCHEN_PRICE}`,
  sameAs: [maxProfileUrl],
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: businessPhoneRaw,
    contactType: 'sales',
    areaServed: 'RU',
    availableLanguage: 'Russian',
  },
  // Строкой — так её читает Яндекс; подробная спецификация ниже — для Google
  openingHours: `Mo-Su ${String(COMPANY.hours.open).padStart(2, '0')}:00-${COMPANY.hours.close}:00`,
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: `${String(COMPANY.hours.open).padStart(2, '0')}:00`,
      closes: `${COMPANY.hours.close}:00`,
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
export function webPageJsonLd({ name, description, path, image }: { name: string; description: string; path: string; image?: string }) {
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
    ...(image ? { primaryImageOfPage: { '@type': 'ImageObject', url: image.startsWith('http') ? image : `${siteUrl}${image}` } } : {}),
  }
}

/** Описание для сниппета из длинного текста: целыми словами, не длиннее limit */
export function snippet(text: string, limit = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= limit) return clean
  const cut = clean.slice(0, limit - 1)
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:—–-]$/, '')}…`
}
