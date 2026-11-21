import { fillingCategories } from '@/lib/filling-data'
import { FillingCard } from '@/components/filling-card'
import { PlanButton, PlanLabel } from '@/components/plan'

const featuredCategories = fillingCategories.slice(0, 3)

export function FillingSection() {
  return (
    <section id="filling" className="paper overflow-hidden py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between" data-anim>
          <div className="max-w-3xl">
            <PlanLabel index={5} className="mb-4">Внутри всё продумано</PlanLabel>
            <h2 className="flyer-title mt-2 text-balance text-3xl text-foreground md:text-5xl">
              Наполнение для порядка без лишних движений
            </h2>
          </div>
          <p className="max-w-sm text-pretty text-sm leading-relaxed text-muted-foreground">
            Подбираем системы хранения под вашу планировку, привычки и состав семьи — чтобы всё нужное всегда было под рукой.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3" data-anim="stagger">
          {featuredCategories.map((category, index) => (
            <FillingCard key={category.title} category={category} index={index} />
          ))}
        </div>

        <div className="grain mt-8 flex flex-col gap-5 rounded-3xl bg-foreground p-6 text-background md:flex-row md:items-center md:justify-between md:p-8" data-anim>
          <div>
            <p className="flyer-title text-2xl md:text-3xl">Ещё больше решений внутри</p>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-background/65">
              Посмотрите все варианты: корзины для посуды, выдвижные сушилки и системы для каждого сантиметра кухни.
            </p>
          </div>
          <PlanButton href="/filling" onDark className="shrink-0">Всё наполнение</PlanButton>
        </div>
      </div>
    </section>
  )
}
