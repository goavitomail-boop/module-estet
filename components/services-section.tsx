import {
  PencilRuler,
  Ruler,
  Calculator,
  LayoutGrid,
  Truck,
  Wrench,
  ShieldCheck,
} from 'lucide-react'
import { PlanLabel, PlanRule } from '@/components/plan'

const services = [
  {
    icon: PencilRuler,
    title: 'Дизайн-проект на дому',
    description:
      'Большой выбор цветовых решений и материалов. Дизайнер приедет к вам и подберёт решение под ваш интерьер.',
  },
  {
    icon: Ruler,
    title: 'Замер помещения',
    description:
      'Точный замер с учётом коммуникаций, ниш и особенностей планировки — основа идеальной посадки кухни.',
  },
  {
    icon: Calculator,
    title: 'Расчёт кухни',
    description:
      'Прозрачная смета без скрытых доплат. Считаем при вас и фиксируем стоимость в договоре.',
  },
  {
    icon: LayoutGrid,
    title: 'Нестандартные решения',
    description:
      'Изготавливаем кухни любой сложности: скошенные стены, эркеры, малогабаритные и студийные пространства.',
  },
  {
    icon: Truck,
    title: 'Доставка заказа',
    description:
      'Аккуратно привезём и поднимем на этаж в удобное для вас время. Упаковка защищает каждый фасад.',
  },
  {
    icon: Wrench,
    title: 'Сборка кухни',
    description:
      'Профессиональный монтаж под ключ: установка, регулировка фасадов, подключение техники и вывоз мусора.',
  },
  {
    icon: ShieldCheck,
    title: 'Гарантийное обслуживание',
    description:
      'Гарантийное и постгарантийное обслуживание. Остаёмся на связи и после сдачи проекта.',
  },
]

export function ServicesSection() {
  return (
    <section id="services" className="paper py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="mb-10 max-w-2xl md:mb-14" data-anim>
          <PlanLabel index={1} className="mb-4">Забота на каждом этапе</PlanLabel>
          <h2 className="flyer-title text-3xl text-foreground md:text-5xl">
            Наши услуги
          </h2>
          <PlanRule className="mt-5 max-w-sm text-primary" />
          <p className="mt-5 text-pretty leading-relaxed text-muted-foreground">
            Берём на себя все этапы, чтобы вы получили кухню мечты без хлопот и
            лишних посредников.
          </p>
        </div>

        <ul className="grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-3" data-anim="stagger">
          {services.map((service, index) => (
            <li
              key={service.title}
              className="plan-hoverline group flex gap-4 border-b border-dotted border-primary/40 pb-6"
            >
              {/* Контурный латунный круг — как иконки обещаний на первом экране */}
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full border border-primary/45 bg-primary/10 text-primary transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                <service.icon className="size-6" aria-hidden="true" strokeWidth={1.5} />
              </span>
              <div>
                <span className="plan-num" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <h3 className="flyer-title mt-1 text-lg text-foreground md:text-xl">
                  {service.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {service.description}
                </p>
              </div>
            </li>
          ))}

          {/* Семь услуг + эта карточка: в три колонки она встаёт восьмой,
              и справа остаётся пустая ячейка. Растягиваем на две. */}
          <li className="grain flex flex-col justify-between gap-5 rounded-3xl border-2 border-primary bg-foreground p-6 lg:col-span-2 lg:flex-row lg:items-center lg:gap-8 lg:p-8">
            <div>
              <h3 className="flyer-title text-xl leading-snug text-background md:text-2xl">
                Не нашли нужную услугу?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-background/70">
                Позвоните — подскажем по любому вопросу и рассчитаем ваш проект.
              </p>
            </div>
            <a
              href="tel:+79253401211"
              className="inline-flex w-fit shrink-0 items-center whitespace-nowrap rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              +7 925 340-12-11
            </a>
          </li>
        </ul>
      </div>
    </section>
  )
}
