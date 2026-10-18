import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { CropMarks } from '@/components/plan'
import { wardrobeCollections, wardrobeCover } from '@/lib/wardrobes-data'

/**
 * Анонс шкафов на главной: сайт до сих пор был только про кухни,
 * и без этого блока раздел /wardrobes находили бы лишь через меню.
 */
export function WardrobesBanner() {
  return (
    <section className="bg-background px-4 py-10 md:px-6 md:py-14" aria-labelledby="wardrobes-banner-title">
      <div className="relative mx-auto max-w-6xl" data-anim>
        <CropMarks />
        <Link
          href="/wardrobes"
          className="group grain flex flex-col overflow-hidden rounded-3xl border-2 border-primary bg-foreground text-background md:flex-row"
        >
          <div className="flex flex-1 flex-col justify-between gap-6 p-6 md:p-10 lg:p-12">
            <div className="flex flex-col gap-4">
              <span className="inline-flex w-fit items-center rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-foreground">
                Новое направление
              </span>
              <h2 id="wardrobes-banner-title" className="flyer-title max-w-xl text-balance text-3xl leading-tight md:text-5xl">
                Модульные шкафы — в одном стиле с кухней
              </h2>
              <p className="max-w-xl text-pretty text-sm leading-relaxed text-background/65 md:text-base">
                Гардеробные, шкафы для гостиной, спальни и прихожей по вашим размерам. Семь коллекций фасадов,
                стеклянные витрины и наполнение под ваши вещи.
              </p>
              <ul className="flex flex-wrap gap-2" aria-label="Коллекции шкафов">
                {wardrobeCollections.map((c) => (
                  <li key={c.id} className="rounded-full border border-background/20 px-3 py-1 text-xs text-background/80">
                    {c.title}
                  </li>
                ))}
              </ul>
            </div>
            <span className="inline-flex min-h-14 w-full items-center justify-between gap-4 rounded-full bg-primary px-6 font-bold text-primary-foreground transition-colors group-hover:bg-background group-hover:text-foreground sm:w-fit">
              Смотреть шкафы
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </div>
          <div className="relative aspect-[4/3] shrink-0 overflow-hidden md:aspect-auto md:w-[46%]">
            <Image
              src={wardrobeCover}
              alt="Модульный шкаф-стеллаж в гостиной"
              fill
              sizes="(max-width: 768px) 100vw, 520px"
              className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
          </div>
        </Link>
      </div>
    </section>
  )
}
