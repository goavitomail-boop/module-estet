import { ArrowUpRight, Clock, MapPin, Phone } from 'lucide-react'
import { CatalogPageHeader } from '@/components/catalog-page-header'
import { HeaderStatus } from '@/components/contact-status'
import { BookingPlanButton } from '@/components/footer-actions'
import { JsonLd } from '@/components/json-ld'
import { MaxSocialIcon } from '@/components/max-social-icon'
import { PlanButton, PlanLabel } from '@/components/plan'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { COMPANY } from '@/lib/company'
import { breadcrumbJsonLd, maxProfileUrl, pageMetadata, siteUrl } from '@/lib/seo'

/**
 * Контакты отдельной страницей. Для Яндекса это один из главных признаков
 * настоящей компании: телефон, часы, адрес и реквизиты текстом, на одном
 * адресе. Адрес, почта и ОГРНИП берутся из lib/company.ts и появятся здесь
 * сами, как только их заполнят; пока их нет, страница их не выдумывает.
 */
const title = 'Контакты: телефон, часы работы и реквизиты'
const description = `Телефон ${COMPANY.phone}, Max, ${COMPANY.schedule.toLowerCase()}. Кухни и шкафы на заказ в Москве и Московской области: бесплатный замер, реквизиты компании.`
const path = '/kontakty'

export const metadata = pageMetadata({ title, description, path })

const mapsUrl = COMPANY.address ? `https://yandex.ru/maps/?text=${encodeURIComponent(COMPANY.address)}` : ''

export default function ContactsPage() {
  const requisites = [
    ['Компания', COMPANY.legalName],
    ['ИНН', COMPANY.inn],
    ['ОГРНИП', COMPANY.ogrnip],
    ['Адрес', COMPANY.address],
    ['Почта', COMPANY.email],
  ].filter(([, value]) => value)

  return (
    <>
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'ContactPage',
            '@id': `${siteUrl}${path}#webpage`,
            url: `${siteUrl}${path}`,
            name: title,
            description,
            inLanguage: 'ru-RU',
            isPartOf: { '@id': `${siteUrl}/#website` },
            about: { '@id': `${siteUrl}/#business` },
          },
          breadcrumbJsonLd([
            { name: 'Главная', path: '/' },
            { name: 'Контакты', path },
          ]),
        ]}
      />
      <SiteHeader overHero />
      <main className="min-h-screen bg-background text-foreground">
        <CatalogPageHeader
          eyebrow="Контакты"
          label="Контакты"
          title="Контакты"
          intro={`Кухни и шкафы на заказ «Модуль Эстет» — ${COMPANY.region}. Позвоните, напишите в Max или запишитесь на бесплатный замер: мастер приедет с образцами фасадов и столешниц.`}
          sectionsLabel="Контакты"
        />

        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:px-8 md:py-20 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-16">
          <section aria-labelledby="contacts-reach" className="flex flex-col gap-8">
            <div>
              <PlanLabel className="mb-3">Связаться</PlanLabel>
              <h2 id="contacts-reach" className="flyer-title text-3xl md:text-5xl">Как с нами связаться</h2>
            </div>

            <ul className="flex flex-col divide-y divide-border border-y border-border">
              <li className="flex flex-col gap-2 py-6">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="size-4 text-primary" aria-hidden="true" />
                  Телефон
                </span>
                <a href={COMPANY.phoneHref} className="flyer-title w-fit text-3xl hover:text-primary md:text-4xl">{COMPANY.phone}</a>
                <HeaderStatus className="text-sm text-muted-foreground" />
              </li>
              <li className="flex flex-col gap-2 py-6">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MaxSocialIcon className="size-4" />
                  Мессенджер Max
                </span>
                <a href={maxProfileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-1.5 text-xl font-semibold hover:text-primary">
                  Написать в Max
                  <ArrowUpRight className="size-5" aria-hidden="true" />
                </a>
              </li>
              <li className="flex flex-col gap-2 py-6">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="size-4 text-primary" aria-hidden="true" />
                  Часы работы
                </span>
                <span className="text-xl font-semibold">{COMPANY.schedule}</span>
              </li>
              <li className="flex flex-col gap-2 py-6">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="size-4 text-primary" aria-hidden="true" />
                  {COMPANY.address ? 'Адрес' : 'Где работаем'}
                </span>
                {COMPANY.address ? (
                  <>
                    <span className="text-xl font-semibold">{COMPANY.address}</span>
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                      Открыть на Яндекс Картах
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    </a>
                  </>
                ) : (
                  <span className="text-xl font-semibold">{COMPANY.region}</span>
                )}
              </li>
            </ul>

            <div className="flex flex-wrap gap-3">
              <BookingPlanButton />
              <PlanButton href="/quiz">Рассчитать кухню</PlanButton>
            </div>
          </section>

          <section aria-labelledby="contacts-legal" className="flex flex-col gap-6 self-start rounded-3xl bg-secondary/60 p-8">
            <h2 id="contacts-legal" className="text-lg font-semibold">Реквизиты</h2>
            <dl className="flex flex-col gap-4">
              {requisites.map(([label, value]) => (
                <div key={label} className="flex flex-col gap-1">
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="text-base font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Стоимость и сроки фиксируем в договоре. Изготовление — {COMPANY.productionTime} после утверждения проекта и материалов.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
