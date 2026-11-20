import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowUpRight, Phone } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { CropMarks, PlanButton, PlanLabel, PlanRule } from '@/components/plan'
import { COMPANY } from '@/lib/company'

// Без своего robots страница унаследовала бы «index, follow» из общего layout
export const metadata: Metadata = {
  title: 'Страница не найдена',
  robots: { index: false, follow: true },
}

/** Куда чаще всего идут с сайта — вместо тупика даём дорогу дальше */
const LINKS = [
  { href: '/#gallery', label: 'Наши кухни', hint: 'Фото готовых проектов' },
  { href: '/wardrobes', label: 'Шкафы', hint: 'Гардеробные и шкафы под размер' },
  { href: '/collections', label: 'Коллекции', hint: 'Фасады и цвета' },
  { href: '/quiz', label: 'Расчёт кухни', hint: 'Ответьте на вопросы — посчитаем стоимость' },
  { href: '/kontakty', label: 'Контакты', hint: 'Адрес, телефон, мессенджер' },
]

/**
 * Своя страница 404 — в чертёжном стиле сайта, на русском и с дорогой дальше.
 * Без неё посетитель видел английскую заглушку Next.js и уходил.
 */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="paper min-h-[70svh] px-4 pb-16 pt-28 md:px-6 md:pb-24 md:pt-36">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <PlanLabel index="404" className="mb-4">
              Страница не найдена
            </PlanLabel>
            <h1 className="flyer-title text-balance text-4xl text-foreground md:text-6xl">Такой страницы у нас нет</h1>
            <p className="mt-5 max-w-xl text-pretty leading-relaxed text-muted-foreground">
              Возможно, ссылка устарела или в адресе опечатка. Начните с главной — или загляните в разделы ниже.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              <PlanButton href="/" className="w-full sm:w-fit">
                На главную
              </PlanButton>
              <a
                href={`tel:${COMPANY.phone.replace(/[^\d+]/g, '')}`}
                className="inline-flex min-h-12 items-center gap-2 font-semibold text-foreground transition-colors hover:text-primary"
              >
                <Phone className="size-4" aria-hidden="true" />
                {COMPANY.phone}
              </a>
            </div>
          </div>

          {/* Размер «404» на чертеже: число, размерная линия и подпись.
              На телефоне не показываем — там важнее сразу увидеть, куда идти */}
          <div className="relative hidden sm:block" aria-hidden="true">
            <CropMarks />
            <div className="rounded-3xl border-2 border-primary bg-background/60 px-6 py-10 text-center md:px-10 md:py-14">
              <p className="flyer-title text-[7rem] leading-none text-foreground md:text-[10rem]">404</p>
              <PlanRule label="мм" className="mx-auto mt-6 max-w-xs text-primary" />
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                такого размера в каталоге нет
              </p>
            </div>
          </div>
        </div>

        <nav className="mx-auto mt-14 max-w-6xl" aria-label="Разделы сайта">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="group flex h-full items-start justify-between gap-3 rounded-2xl border border-border bg-background p-5 transition-colors hover:border-primary"
                >
                  <span>
                    <span className="block font-semibold text-foreground">{link.label}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{link.hint}</span>
                  </span>
                  <ArrowUpRight className="size-5 shrink-0 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>
      <SiteFooter />
    </>
  )
}
