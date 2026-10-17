import { PlanLabel, PlanRule } from '@/components/plan'

const steps = [
  {
    number: '01',
    title: 'Звонок и консультация',
    description:
      'Обсуждаем пожелания, отвечаем на вопросы и договариваемся о замере.',
  },
  {
    number: '02',
    title: 'Замер и дизайн-проект',
    description:
      'Выезжаем к вам домой, делаем замер и готовим проект с 3D-визуализацией.',
  },
  {
    number: '03',
    title: 'Расчёт и договор',
    description:
      'Фиксируем стоимость и сроки в договоре. Никаких сюрпризов в процессе.',
  },
  {
    number: '04',
    title: 'Производство',
    description:
      'Изготавливаем кухню на собственном производстве с контролем качества.',
  },
  {
    number: '05',
    title: 'Доставка и сборка',
    description:
      'Привозим, собираем и подключаем технику. Вы получаете готовую кухню.',
  },
]

export function ProcessSection() {
  return (
    <section id="process" className="paper py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="mb-12 max-w-2xl md:mb-16" data-anim>
          <PlanLabel index={7} className="mb-4">Как мы работаем</PlanLabel>
          <h2 className="flyer-title text-balance text-3xl text-foreground md:text-5xl">
            Пять шагов до кухни вашей мечты
          </h2>
        </div>

        {/* Размерная линия над шагами — весь путь от звонка до сборки */}
        <PlanRule label="5 этапов" className="mb-8 hidden text-primary md:block [--plan-rule-bg:var(--paper)]" />

        <ol className="grid gap-4 md:grid-cols-5 md:gap-5" data-anim="stagger">
          {steps.map((step, index) => (
            <li
              key={step.number}
              className="plan-hoverline relative flex flex-col gap-3 rounded-2xl border-t-2 border-primary bg-background p-6 shadow-[0_1px_0_0_var(--border)] md:p-5"
            >
              <span className="flyer-title text-4xl text-primary">
                {step.number}
              </span>
              <h3 className="flyer-title text-lg leading-snug text-foreground">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
              {index < steps.length - 1 && (
                <span
                  className="absolute -right-3 top-1/2 hidden h-px w-6 bg-primary/40 md:block"
                  aria-hidden="true"
                />
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
