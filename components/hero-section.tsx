'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, CalendarDays, Ruler, Factory, ShieldCheck } from 'lucide-react'
import { HeroPlan } from '@/components/hero-plan'

/**
 * Три обещания под первым экраном.
 * Первая строка — сам факт, вторая — что за ним стоит. Иконки те же,
 * что в блоке преимуществ и в подвале, чтобы язык сайта был единым.
 */
const promises = [
  { icon: Ruler, title: 'По вашим меркам', note: 'Проект под вашу планировку' },
  { icon: Factory, title: 'Своя фабрика', note: 'Производство в Московской области' },
  { icon: ShieldCheck, title: 'Гарантия 5 лет', note: 'По договору, с сервисом' },
]

function InteriorPreview() {
  return (
    <a href="#gallery" className="hero-life__preview group" aria-label="Посмотреть наши кухни">
      <div className="hero-life__preview-image">
        <Image
          src="/images/hero-client-kitchen.webp"
          alt="Кухня с графитовыми фасадами и светлым дубом"
          fill
          sizes="96px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-xs sm:text-sm text-background/70">От идеи — к жизни</span>
        <span className="text-sm sm:text-base font-medium text-background">Посмотрите наши кухни</span>
      </span>
      <ArrowUpRight className="size-4 sm:size-5 shrink-0 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
    </a>
  )
}

export function HeroSection() {
  return (
    <section id="top" aria-labelledby="hero-title" className="hero-life font-sans">
      {/* 1. Кадр реальной кухни — материализуется из чертежа */}
      <div className="hero-life__media">
        <Image
          src="/images/hero-kitchen-night.webp"
          alt="Кухня с островом из камня, барными стульями и подсветкой фартука в тёплом вечернем свете"
          fill
          priority
          sizes="100vw"
          className="hero-life__image object-cover"
        />
      </div>

      {/* 2. Затемнение под текст (+ зерно плёнки). На мобильных фото уходит почти в фон */}
      <div className="hero-life__shade" aria-hidden="true" />

      {/* 3. Чертёжный слой: выноски, размер, метки обреза */}
      <HeroPlan />

      <div className="hero-life__inner">
        <div className="hero-life__body">
          <div className="hero-life__copy">
            <p className="hero-life__eyebrow">
              <span className="hero-life__eyebrow-line" aria-hidden="true" />
              <span className="hero-life__eyebrow-text">Кухни на заказ · Москва и МО</span>
            </p>

            {/* Рукописная строка перед заголовком — тот же приём, что в
                заставке и в баннере квиза. Раньше она жила в правой колонке
                и пропадала на всём, что уже планшета. */}
            <p className="hero-life__script flyer-script flyer-script--lead">
              {/* Каждая фраза на своей строке: иначе перенос рвёт вторую
                  посередине («Место / быть собой») */}
              <span className="block">Не просто мебель.</span>
              <span className="block">Место быть собой.</span>
            </p>

            {/* Каждая строка выезжает из-под своей маски: .hero-line обрезает,
                внутренний span поднимается (см. hero-line-rise в globals.css) */}
            <h1 id="hero-title" className="hero-life__title text-balance">
              <span className="hero-line"><span>Кухня,</span></span>
              <span className="hero-line"><span>в которой</span></span>
              <span className="hero-line"><span className="text-primary">хочется жить.</span></span>
            </h1>

            <p className="hero-life__description text-pretty">
              Для первого кофе. Для долгих разговоров.
              <br className="hidden sm:block" />
              {' Для всего, что делает дом вашим.'}
            </p>

            {/* Два пути: быстрый (квиз на минуту) и живой (замер). Подпись под
                главной кнопкой снимает главный страх — «это надолго?» */}
            <div className="hero-life__action">
              <div className="hero-life__buttons">
                <Link href="/quiz" className="hero-life__button group">
                  <span className="hero-life__button-text">
                    <span>Рассчитать кухню за минуту</span>
                    <small>5 простых вопросов · бесплатно</small>
                  </span>
                  <span className="hero-life__button-icon" aria-hidden="true">
                    <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                </Link>
                <button
                  type="button"
                  className="hero-life__button hero-life__button--ghost"
                  onClick={() => window.dispatchEvent(new Event('measurement-booking:open'))}
                >
                  <CalendarDays className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
                  Записаться на замер
                </button>
              </div>
              {/* Статус «на связи» переехал в шапку, под название — рядом со звонком */}
            </div>
          </div>

          {/* Живое доказательство: реальные кухни клиентов и слоган.
              На десктопе — справа от заголовка, на мобильном карточка уезжает
              под кнопку и растягивается на всю ширину. Скрывать её нельзя:
              это единственный вход в портфолио с первого экрана. */}
          <div className="hero-life__aside">
            <InteriorPreview />
          </div>
        </div>

        {/* Нижний ряд преимуществ */}
        <div className="hero-life__footer">
          <ul className="hero-life__promises">
            {promises.map((promise, index) => (
              <li key={promise.title} className="hero-life__promise">
                <span className="hero-life__promise-icon" aria-hidden="true">
                  <promise.icon strokeWidth={1.5} />
                </span>
                <span className="hero-life__promise-body">
                  <span className="hero-life__promise-num" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <span className="hero-life__promise-title flyer-title">{promise.title}</span>
                  <span className="hero-life__promise-note">{promise.note}</span>
                </span>
              </li>
            ))}
          </ul>
          {/* Индикатор прокрутки: по тонкой линии бежит латунный отрезок */}
          <a href="#services" className="hero-life__scroll" aria-label="Узнать больше о наших услугах">
            <span className="hero-life__scroll-label" aria-hidden="true">Листайте</span>
            <span className="hero-life__scroll-track" aria-hidden="true">
              <span />
            </span>
          </a>
        </div>
      </div>
    </section>
  )
}
