'use client'

import { Phone } from 'lucide-react'
import { MaxSocialIcon } from '@/components/max-social-icon'
import { CropMarks, PlanButton, PlanLabel } from '@/components/plan'
import { ContactStatus } from '@/components/contact-status'

export function CtaSection() {
  return (
    <section className="px-4 pb-16 md:px-6 md:pb-24" data-floating-hide>
      <div className="grain relative mx-auto max-w-6xl rounded-3xl border-2 border-primary bg-foreground px-6 py-14 text-center md:px-12 md:py-20" data-anim>
        <CropMarks />
        <div className="flex flex-col items-center gap-5">
          <PlanLabel>Бесплатная консультация</PlanLabel>

          <h2 className="flyer-title max-w-2xl text-balance text-3xl text-background md:text-5xl">
            Кухня вашей мечты
          </h2>
          <p className="flyer-script -mt-2 text-3xl text-primary md:text-5xl">
            начинается с одного звонка!
          </p>

          <p className="max-w-xl text-pretty leading-relaxed text-background/70">
            Позвоните или напишите — дизайнер ответит на вопросы и подскажет,
            с чего начать. Первая консультация и замер бесплатны.
          </p>

          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
            <PlanButton onDark onClick={() => window.dispatchEvent(new Event('measurement-booking:open'))}>
              Записаться на замер
            </PlanButton>
            <a
              href="tel:+79253401211"
              className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full border-2 border-primary px-8 font-bold text-background transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <Phone className="size-5" aria-hidden="true" />
              Позвонить
            </a>
            <a
              href="https://web.max.ru/93711404"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-14 items-center justify-center gap-2.5 rounded-full border border-background/25 bg-background/5 px-6 font-bold text-background transition-colors hover:border-primary hover:bg-primary/20 hover:text-primary"
              aria-label="Написать нам в Max: web.max.ru/93711404"
              title="Написать нам в Max"
            >
              <MaxSocialIcon className="size-6" />
              <span>Написать в Max</span>
            </a>
          </div>

          {/* Раньше здесь было «Квиз займёт около 5 минут», хотя кнопки
              квиза в блоке нет. Статус по графику полезнее у кнопки «Позвонить» */}
          <ContactStatus />

        </div>
      </div>
    </section>
  )
}
