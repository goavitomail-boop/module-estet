import type { CSSProperties } from 'react'
import { ArrowRight, Check, Clock3 } from 'lucide-react'
import { CropMarks } from '@/components/plan'
import { PlayWhenSeen } from '@/components/play-when-seen'
import { enter, Finger } from '@/components/scene-kit'

const highlights = [
  'Около минуты',
  'Можно отвечать «не знаю»',
  'Бесплатно и без обязательств',
]

// Строки сводки влетают по одной, как ответы на экране «спасибо»,
// затем палец нажимает кнопку: видно, что получится и где начать
const ROW_AT = 0.25
const ROW_STEP = 0.14
const TAP_AT = 2.05

// Значения взяты из вариантов ответа квиза, чтобы образец совпадал с тем,
// что человек увидит внутри
const sampleSummary = [
  ['Планировка', 'Угловая'],
  ['Размер', '3–4 м'],
  ['Стиль', 'Минимализм'],
  ['Пожелания', 'Посудомойка, подсветка'],
  ['Сроки', '1–3 месяца'],
]

export function QuizBanner() {
  return (
    <section className="bg-background px-4 py-10 md:px-6 md:py-14" aria-labelledby="quiz-banner-title">
      {/* Обёртка без overflow: метки обреза стоят снаружи углов карточки */}
      <div className="relative mx-auto max-w-6xl" data-anim>
      <CropMarks />
      <div className="grain flex flex-col overflow-hidden rounded-3xl border-2 border-primary bg-foreground text-background md:flex-row">
        <div className="flex flex-1 flex-col gap-6 p-6 md:p-10 lg:p-12">
          <div className="flex items-center gap-2 text-primary">
            <Clock3 className="size-4" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-[0.18em]">5 простых вопросов · 1 минута</span>
          </div>

          <div className="flex flex-col gap-3">
            <h2 id="quiz-banner-title" className="flyer-title max-w-3xl text-balance text-3xl leading-tight md:text-5xl">
              Расскажите о кухне — дизайнер предложит идеи и расчёт
            </h2>
            <p className="max-w-2xl text-pretty text-sm leading-relaxed text-background/65 md:text-base">
              Хватит примерного ответа, а если сомневаетесь — жмите «не знаю». Точные размеры и материалы подберём вместе.
            </p>
          </div>

          <ul className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-6">
            {highlights.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-background/80">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3" aria-hidden="true" strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <PlayWhenSeen className="flex shrink-0 flex-col justify-between gap-8 border-t border-background/15 bg-primary p-6 text-primary-foreground md:w-72 md:border-l md:border-t-0 md:p-8 lg:w-80">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary-foreground/65">Что получит дизайнер</p>
            <p className="flyer-title mt-3 text-2xl leading-tight">Коротко о вашей кухне</p>
            {/* Образец того, что получит дизайнер: без него панель пустая
                и непонятно, что значит «сводка» */}
            <dl className="mt-5 rounded-2xl bg-foreground/10 p-4 text-sm" aria-label="Пример сводки">
              {sampleSummary.map(([term, value], i) => (
                <div
                  key={term}
                  className="hs-in flex items-baseline justify-between gap-3 border-b border-dotted border-primary-foreground/25 py-1.5 last:border-b-0"
                  style={enter(ROW_AT + i * ROW_STEP, { t: 0.55, from: 'translateX(-12px)', ease: 'var(--out)' })}
                >
                  <dt className="text-primary-foreground/65">{term}</dt>
                  <dd className="text-right font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <a
            href="/quiz"
            className="hs-press group relative inline-flex min-h-14 items-center justify-between rounded-full bg-foreground px-6 font-bold text-background transition-colors hover:bg-background hover:text-foreground"
            style={{ '--d': `${TAP_AT}s`, '--press': 0.96 } as CSSProperties}
          >
            <Finger d={TAP_AT - 0.55} tap={TAP_AT} out={TAP_AT + 0.55} />
            Ответить на вопросы
            <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </a>
        </PlayWhenSeen>
      </div>
      </div>
    </section>
  )
}
