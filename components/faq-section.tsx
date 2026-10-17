import { ChevronDown, Phone } from 'lucide-react'
import { MaxSocialIcon } from '@/components/max-social-icon'
import { faqItems as questions } from '@/lib/faq-data'
import { PlanLabel } from '@/components/plan'

export function FaqSection() {
  return (
    <section id="faq" className="px-4 py-16 md:px-6 md:py-24" aria-labelledby="faq-title">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
        <div className="flex flex-col items-start gap-4 lg:sticky lg:top-28 lg:self-start" data-anim>
          <PlanLabel index={8}>Ответы на вопросы</PlanLabel>
          <h2 id="faq-title" className="flyer-title text-balance text-4xl text-foreground md:text-6xl">Частые вопросы</h2>
          <p className="max-w-md text-pretty leading-relaxed text-muted-foreground">Не нашли нужного ответа? Позвоните или напишите нам в соцсеть Макс — расскажем о процессе, материалах и рассчитаем ваш проект.</p>
          <div className="flex flex-wrap items-center gap-2.5">
            <a href="tel:+79253401211" className="inline-flex min-h-12 items-center gap-3 rounded-full bg-foreground px-6 py-3 font-bold text-background transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
              <Phone className="size-5" aria-hidden="true" />
              Задать вопрос
            </a>
            <a
              href="https://web.max.ru/93711404"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center gap-2.5 rounded-full border border-primary/40 bg-background px-5 py-3 font-bold text-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Задать вопрос нам в Max: web.max.ru/93711404"
              title="Написать нам в Max"
            >
              <MaxSocialIcon className="size-5" />
              <span>Написать в Max</span>
            </a>
          </div>
        </div>

        <div className="border-t-2 border-primary" data-anim="stagger" data-anim-shift="16">
          {questions.map((item, index) => (
            <details key={item.question} className="plan-hoverline group border-b border-border open:border-primary/60" open={index === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-6 font-bold text-foreground outline-none transition-colors hover:text-primary focus-visible:text-primary [&::-webkit-details-marker]:hidden">
                <span className="flex items-baseline gap-4">
                  <span className="plan-num w-6 shrink-0" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <span className="text-pretty text-lg md:text-xl">{item.question}</span>
                </span>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-primary text-primary transition-transform duration-300 group-open:rotate-180">
                  <ChevronDown className="size-4" aria-hidden="true" />
                </span>
              </summary>
              <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 group-open:grid-rows-[1fr]">
                <div className="overflow-hidden">
                  <p className="max-w-2xl pb-6 pl-10 pr-10 leading-relaxed text-muted-foreground">{item.answer}</p>
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
