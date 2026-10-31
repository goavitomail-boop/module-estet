import Link from 'next/link'
import { ArrowUpRight, Clock, MapPin } from 'lucide-react'
import { ModuleEstetMark } from '@/components/module-estet-logo'
import { MaxSocialIcon } from '@/components/max-social-icon'
import { BackToTop, FooterBookingLink } from '@/components/footer-actions'
import { COMPANY, legalLine } from '@/lib/company'

const MAX_URL = 'https://web.max.ru/93711404'

const columns = [
  {
    title: 'Компания',
    links: [
      { href: '/#services', label: 'Услуги' },
      { href: '/portfolio', label: 'Наши кухни' },
      { href: '/#process', label: 'Как мы работаем' },
      { href: '/#faq', label: 'Частые вопросы' },
      { href: '/stati', label: 'Статьи' },
      { href: '/kontakty', label: 'Контакты' },
    ],
  },
  {
    title: 'Кухни',
    links: [
      { href: '/kuhni/uglovye', label: 'Угловые' },
      { href: '/kuhni/bez-ruchek', label: 'Без ручек' },
      { href: '/kuhni/sovremennye', label: 'Современные' },
      { href: '/kuhni/klassicheskie', label: 'Классические' },
      { href: '/kuhni', label: 'Все типы' },
    ],
  },
  {
    title: 'Каталог',
    links: [
      { href: '/facades', label: 'Фасады' },
      { href: '/countertops', label: 'Столешницы' },
      { href: '/materials', label: 'Материалы' },
      { href: '/filling', label: 'Наполнение' },
      { href: '/collections', label: 'Коллекции' },
      { href: '/wardrobes', label: 'Шкафы' },
    ],
  },
]

const linkClass = 'text-sm text-background/65 transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none'
const headingClass = 'mb-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary'

/**
 * Подвал в три яруса: телефон и слоган → ссылки → большая подпись бренда.
 *
 * Полосу «индивидуальный подход / материалы / производство» убрали: те же
 * три тезиса уже есть в блоке «Почему мы» и на первом экране.
 */
export function SiteFooter() {
  return (
    <footer id="contacts" className="grain relative overflow-hidden bg-foreground text-background" data-floating-hide>
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        {/* Ярус 1: главное, ради чего открывают «Контакты», — телефон */}
        <div className="grid gap-10 border-b border-background/10 pb-12 pt-16 md:grid-cols-[1.4fr_1fr] md:items-end md:pb-16 md:pt-24">
          <div className="flex flex-col gap-5">
            <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              <span className="h-px w-8 bg-primary" aria-hidden="true" />
              Звоните — обсудим вашу кухню
            </p>
            <a
              href={COMPANY.phoneHref}
              className="flyer-title w-fit text-[clamp(2.4rem,7vw,4.75rem)] leading-none tracking-tight text-background transition-colors hover:text-primary"
            >
              {COMPANY.phone}
            </a>
            <div className="flex flex-col gap-2.5 text-sm text-background/60 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
              <span className="flex items-center gap-2">
                <Clock className="size-4 shrink-0 text-primary" aria-hidden="true" />
                {COMPANY.schedule}
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />
                {COMPANY.region}
              </span>
              <a
                href={MAX_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex w-fit items-center gap-2 text-background transition-colors hover:text-primary"
              >
                <MaxSocialIcon className="size-5" />
                <span className="border-b border-background/25 transition-colors group-hover:border-primary">Написать в Max</span>
              </a>
            </div>
          </div>

          <p className="flyer-script flyer-script--lead text-primary md:text-right">
            Для вашей
            <br />
            красивой жизни.
          </p>
        </div>

        {/* Ярус 2: бренд и навигация */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr] md:py-16">
          <div className="col-span-2 flex flex-col gap-5 md:col-span-1 md:pr-10">
            <ModuleEstetMark className="size-14" />
            <p className="max-w-xs text-sm leading-relaxed text-background/60">
              Проектируем, производим и устанавливаем кухни на заказ. Выезд дизайнера
              и замер — бесплатно.
            </p>
          </div>

          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h3 className={headingClass}>{column.title}</h3>
              <ul className="flex flex-col gap-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={linkClass}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div>
            <h3 className={headingClass}>Клиентам</h3>
            <ul className="flex flex-col gap-3">
              <li>
                <Link href="/quiz" className={`${linkClass} inline-flex items-center gap-1`}>
                  Рассчитать проект
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </Link>
              </li>
              <li>
                <FooterBookingLink className={linkClass} />
              </li>
              <li>
                <Link href="/privacy" className={linkClass}>
                  Политика конфиденциальности
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Ярус 3: подпись бренда во всю ширину. SVG с textLength — надпись
          ровно по ширине контейнера на любом экране, без подбора кегля */}
      <div className="mx-auto max-w-6xl px-4 md:px-6" aria-hidden="true">
        <svg viewBox="0 0 1000 150" className="block h-auto w-full select-none" focusable="false">
          <defs>
            <linearGradient id="footer-wordmark-fade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <text
            x="0"
            y="138"
            textLength="1000"
            lengthAdjust="spacingAndGlyphs"
            fill="url(#footer-wordmark-fade)"
            style={{ fontFamily: 'var(--font-oswald), Arial Narrow, sans-serif', fontWeight: 600, fontSize: 176 }}
          >
            МОДУЛЬ ЭСТЕТ
          </text>
        </svg>
      </div>

      <div className="border-t border-background/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-xs text-background/45 md:flex-row md:items-center md:justify-between md:gap-8 md:px-6">
          <div className="flex flex-col gap-1.5">
            <p>© {new Date().getFullYear()} {COMPANY.brand}. Все права защищены.</p>
            <p className="leading-relaxed">{legalLine()}</p>
          </div>
          <BackToTop className="shrink-0 self-start text-xs font-semibold uppercase tracking-[0.18em] text-background/70 transition-colors hover:text-primary md:self-center" />
        </div>
      </div>
    </footer>
  )
}
