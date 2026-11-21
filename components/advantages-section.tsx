import { Gem, ShieldCheck, Factory } from 'lucide-react'
import { FactoryCut } from '@/components/factory-cut'
import { PlanLabel, PlanTag } from '@/components/plan'

const advantages = [
  {
    icon: Gem,
    title: 'Индивидуальный подход',
    description:
      'Не продаём типовые решения. Каждый проект создаём под вашу планировку, привычки и стиль жизни.',
  },
  {
    icon: ShieldCheck,
    title: 'Качественные материалы',
    description:
      'Работаем с проверенными поставщиками плит, фасадов и фурнитуры. Материалы сертифицированы и долговечны.',
  },
  {
    icon: Factory,
    title: 'Собственное производство',
    description:
      'Полный контроль качества на каждом этапе и честные цены без наценок посредников.',
  },
]

export function AdvantagesSection() {
  return (
    <section className="bg-background py-16 md:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 md:grid-cols-2 md:gap-14 md:px-6">
        <div className="relative order-2 md:order-1">
          {/* Своё производство одной сценой: раскрой листа и сборка каркаса */}
          <div className="paper relative aspect-[4/3] overflow-hidden rounded-3xl border-2 border-primary" data-anim="image">
            <FactoryCut />
            <PlanTag title="Своя фабрика" value="Московская область" dot className="pointer-events-none absolute bottom-4 left-4" />
          </div>
          {/* Бейдж в стиле бирки: прямые углы, латунная рамка, зерно */}
          <div className="grain absolute -right-2 -top-5 rounded-md border border-primary/60 bg-foreground px-5 py-3 md:-right-6">
            <p className="flyer-title text-2xl text-primary" data-anim="count" data-anim-to="100" data-anim-suffix="%">100%</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-background/70">контроль качества</p>
          </div>
        </div>

        <div className="order-1 md:order-2">
          <div data-anim>
            <PlanLabel index={6} className="mb-4">Почему мы</PlanLabel>
          </div>
          <h2 className="flyer-title text-balance text-3xl text-foreground md:text-5xl" data-anim data-anim-delay="0.1">
            Кухня, которая прослужит годами
          </h2>
          <ul className="mt-9 flex flex-col gap-7" data-anim="stagger">
            {advantages.map((item, index) => (
              <li key={item.title} className="plan-hoverline group flex gap-5 border-b border-dotted border-primary/40 pb-6 last:border-b-0">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-full border border-primary/45 bg-primary/10 text-primary transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                  <item.icon className="size-6" aria-hidden="true" strokeWidth={1.5} />
                </span>
                <div>
                  <span className="plan-num" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <h3 className="flyer-title mt-1 text-lg text-foreground md:text-xl">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
