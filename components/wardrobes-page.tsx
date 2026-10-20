import Image from 'next/image'
import { Check } from 'lucide-react'
import { CatalogPageHeader } from '@/components/catalog-page-header'
import { FacadePalette } from '@/components/facade-palette'
import { BookingPlanButton } from '@/components/footer-actions'
import { CropMarks, PlanButton, PlanLabel, PlanTag } from '@/components/plan'
import { WardrobeInside } from '@/components/wardrobe-inside'
import { COMPANY } from '@/lib/company'
import {
  vetrine,
  wardrobeCollections,
  wardrobeCover,
  wardrobeHeights,
  wardrobeHighlights,
  wardrobeRooms,
  wardrobeSchemes,
  wardrobeSeries,
  wardrobeSpecs,
  type WardrobeCollection,
} from '@/lib/wardrobes-data'

const MAX_URL = 'https://web.max.ru/93711404'

const sections = [
  { id: 'series', title: 'Серии' },
  ...wardrobeCollections.map((c) => ({ id: c.id, title: c.title })),
  { id: vetrine.id, title: 'Витрины' },
  { id: 'specs', title: 'Устройство' },
  { id: 'sizes', title: 'Размеры' },
]

/** Чипы характеристик — тот же вид, что в коллекциях кухонь */
function Specs({ specs }: { specs: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {specs.map((spec) => (
        <span
          key={spec}
          className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm text-foreground"
        >
          <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
          {spec}
        </span>
      ))}
    </div>
  )
}

/**
 * Фото шкафов в основном вертикальные, а в каталоге кухонь галерея режет
 * всё в 4:3. Здесь ряд одной высоты: каждое фото занимает ширину по своим
 * пропорциям, и шкаф виден целиком. На телефоне ряд был бы слишком низким —
 * там две колонки с обрезкой до 3:4.
 */
function Gallery({ photos }: { photos: { image: string; alt: string; width: number; height: number }[] }) {
  return (
    <div className="mb-10 grid grid-cols-2 gap-3 sm:flex sm:gap-4">
      {photos.map((p, i) => (
        <div
          key={p.image}
          className={`relative overflow-hidden rounded-2xl bg-muted sm:aspect-auto ${i === 0 ? 'col-span-2 aspect-[4/3]' : 'aspect-[3/4]'}`}
          style={{ flex: `${p.width / p.height} 1 0%` }}
        >
          {/* Распорка задаёт высоту по пропорциям фото — только в ряду на sm+ */}
          <div className="hidden sm:block" style={{ paddingTop: `${(p.height / p.width) * 100}%` }} />
          <Image src={p.image} alt={p.alt} fill sizes="(max-width: 640px) 100vw, 40vw" className="object-cover" />
        </div>
      ))}
    </div>
  )
}

function CollectionBlock({ collection, index }: { collection: WardrobeCollection; index: number }) {
  return (
    <section id={collection.id} className="scroll-mt-24 border-t border-border py-14 md:py-20">
      <div className="mb-8 grid gap-5 md:grid-cols-[0.75fr_1.25fr]">
        <div>
          <PlanLabel index={index + 2} className="mb-3">
            Серия {collection.series}
          </PlanLabel>
          <h2 className="flyer-title text-4xl text-balance text-foreground md:text-6xl">{collection.title}</h2>
          <p className="mt-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">{collection.tagline}</p>
        </div>
        <div className="flex flex-col gap-4">
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">{collection.description}</p>
          <Specs specs={collection.specs} />
        </div>
      </div>

      <figure className="mb-4">
        <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-muted">
          <Image src={collection.hero} alt={`Шкаф ${collection.title} в интерьере`} fill sizes="(max-width: 1280px) 100vw, 1216px" className="object-cover" />
          <PlanTag title="Коллекция" value={collection.title} dot className="absolute bottom-4 left-4" />
        </div>
        <figcaption className="mt-3 text-xs text-muted-foreground">
          <strong className="font-semibold text-foreground">Серия {collection.series}</strong> · {collection.caption}
        </figcaption>
      </figure>

      <Gallery photos={collection.gallery} />

      <FacadePalette items={collection.colors} label="Цвета фасадов" note={collection.paletteNote} />
    </section>
  )
}

function HeightsChart() {
  const max = 3000
  return (
    <div className="grid gap-8 md:grid-cols-2">
      {wardrobeHeights.map((row) => (
        <div key={row.base} className="rounded-2xl border border-border bg-card p-5 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Корпус {row.base} мм</p>
          <p className="mt-1 text-sm text-muted-foreground">
            С антресолью — от {row.base + row.mezzanines[0]} до {row.base + row.mezzanines[row.mezzanines.length - 1]} мм
          </p>
          <div className="mt-6 flex h-56 items-end gap-2" role="img" aria-label={`Высоты шкафа с корпусом ${row.base} мм и антресолью`}>
            {row.mezzanines.map((m) => {
              const total = row.base + m
              return (
                <div key={m} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-[11px] font-semibold tabular-nums text-foreground">{total}</span>
                  {/* Высоты частей — в одном масштабе: верх корпуса у всех столбиков
                      на одной линии, и разница антресолей видна сразу */}
                  <div className="flex w-full flex-col">
                    <div
                      className="flex items-center justify-center rounded-t-md border border-b-0 border-dashed border-primary bg-primary/25 text-[10px] font-semibold tabular-nums text-foreground"
                      style={{ height: `${(m / max) * 12}rem` }}
                    >
                      {m}
                    </div>
                    <div className="rounded-b-md bg-foreground/80" style={{ height: `${(row.base / max) * 12}rem` }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded-sm border border-dashed border-primary bg-primary/25" aria-hidden="true" />
              антресоль
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-foreground/80" aria-hidden="true" />
              корпус {row.base} мм
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

export function WardrobesPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <CatalogPageHeader
        eyebrow="Шкафы"
        title="Модульные шкафы"
        intro="Гардеробные, шкафы для гостиной, спальни и прихожей. Семь коллекций фасадов, стеклянные витрины и наполнение под ваши вещи — по размерам вашего помещения."
        action={
          <PlanButton href="/quiz?type=wardrobe" onDark>
            Рассчитать шкаф онлайн
          </PlanButton>
        }
        sections={sections}
        sectionsLabel="Разделы страницы"
      />

      <div className="mx-auto max-w-7xl px-5 md:px-8">
        {/* ── Вступление ── */}
        <section className="grid gap-8 py-14 md:grid-cols-[1fr_1.2fr] md:items-center md:py-20">
          <div>
            <PlanLabel className="mb-4">Индивидуальное решение по цене серийного</PlanLabel>
            <h2 className="flyer-title text-3xl text-balance md:text-5xl">Максимум хранения в каждом сантиметре</h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              Модульная система объединяет гибкость шкафа на заказ с преимуществами серийного производства. Шкаф
              подстраивается под помещение, использует каждый сантиметр и сохраняет единый стиль интерьера — без
              компромиссов между дизайном, удобством и стоимостью.
            </p>
            <ul className="mt-8 flex flex-col gap-5">
              {wardrobeHighlights.map((item) => (
                <li key={item.title} className="flex gap-3">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-semibold">{item.title}</span>
                    <span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground">{item.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <CropMarks />
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
              <Image src={wardrobeCover} alt="Модульный шкаф-стеллаж в гостиной" fill priority sizes="(max-width: 768px) 100vw, 55vw" className="object-cover" />
            </div>
          </div>
        </section>

        {/* ── Комнаты ── */}
        <section className="pb-14 md:pb-20" aria-labelledby="rooms-title">
          <h2 id="rooms-title" className="sr-only">
            Шкафы для разных комнат
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {wardrobeRooms.map((room) => (
              <figure key={room.title} className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="relative aspect-[4/3] bg-muted">
                  <Image src={room.image} alt={`Шкаф в интерьере: ${room.title.toLowerCase()}`} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />
                </div>
                <figcaption className="p-4">
                  <p className="flyer-title text-xl">{room.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{room.note}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* ── Две серии ── */}
        <section id="series" className="scroll-mt-24 border-t border-border py-14 md:py-20">
          <PlanLabel index={1} className="mb-3">
            С ручками или без
          </PlanLabel>
          <h2 className="flyer-title mb-8 text-4xl text-balance md:text-6xl">Две серии</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {wardrobeSeries.map((series) => (
              <div key={series.id} className="grain rounded-2xl bg-foreground p-6 text-background md:p-8">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">{series.id}</p>
                <h3 className="flyer-title mt-2 text-3xl">{series.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-background/70">{series.description}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {series.collections.map((name) => {
                    const target = wardrobeCollections.find((c) => c.title === name)
                    return (
                      <a key={name} href={`#${target?.id ?? ''}`} className="plan-chip plan-chip--on-dark">
                        {name}
                      </a>
                    )
                  })}
                </div>
                <p className="mt-5 border-t border-background/15 pt-4 text-xs leading-relaxed text-background/55">{series.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {wardrobeCollections.map((collection, index) => (
          <CollectionBlock key={collection.id} collection={collection} index={index} />
        ))}

        {/* ── Витрины ── */}
        <section id={vetrine.id} className="scroll-mt-24 border-t border-border py-14 md:py-20">
          <div className="mb-8 grid gap-5 md:grid-cols-[0.75fr_1.25fr]">
            <div>
              <PlanLabel index={wardrobeCollections.length + 2} className="mb-3">
                Для любой коллекции
              </PlanLabel>
              <h2 className="flyer-title text-4xl text-foreground md:text-6xl">{vetrine.title}</h2>
              <p className="mt-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">{vetrine.tagline}</p>
            </div>
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">{vetrine.description}</p>
          </div>
          <figure className="mb-4">
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-muted">
              <Image src={vetrine.hero} alt="Шкаф с витринами Vetrine в гостиной" fill sizes="(max-width: 1280px) 100vw, 1216px" className="object-cover" />
              <PlanTag title="Витрины" value={vetrine.title} dot className="absolute bottom-4 left-4" />
            </div>
            <figcaption className="mt-3 text-xs text-muted-foreground">{vetrine.caption}</figcaption>
          </figure>
          <Gallery photos={vetrine.gallery} />
          <div className="grid gap-4 sm:grid-cols-3">
            {vetrine.options.map((option) => (
              <div key={option.title} className="rounded-2xl border border-border bg-card p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{option.title}</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {option.values.map((value) => (
                    <li key={value} className="rounded-full border border-border px-3 py-1 text-sm">
                      {value}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ── Устройство шкафа ── */}
        <section id="specs" className="scroll-mt-24 border-t border-border py-14 md:py-20">
          <PlanLabel index={wardrobeCollections.length + 3} className="mb-3">
            Корпус, наполнение, фурнитура
          </PlanLabel>
          <h2 className="flyer-title mb-10 text-4xl text-balance md:text-6xl">Что внутри шкафа</h2>
          <WardrobeInside />
          <div className="grid gap-6 lg:grid-cols-2">
            {wardrobeSpecs.map((group) => (
              <article key={group.id} className="grid overflow-hidden rounded-2xl border border-border bg-card sm:grid-cols-[11rem_1fr]">
                <div className="relative aspect-[4/3] bg-muted sm:aspect-auto">
                  <Image src={group.image} alt={group.title} fill sizes="(max-width: 640px) 100vw, 176px" className="object-cover" />
                </div>
                <div className="p-5 md:p-6">
                  <h3 className="flyer-title text-2xl">{group.title}</h3>
                  <dl className="mt-4 flex flex-col gap-3">
                    {group.items.map((item) => (
                      <div key={item.name} className="border-b border-dotted border-border pb-3 last:border-0 last:pb-0">
                        <dt className="text-sm font-semibold">{item.name}</dt>
                        <dd className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{item.detail}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── Размеры ── */}
        <section id="sizes" className="scroll-mt-24 border-t border-border py-14 md:py-20">
          <PlanLabel index={wardrobeCollections.length + 4} className="mb-3">
            Высоты и секции
          </PlanLabel>
          <h2 className="flyer-title mb-4 text-4xl text-balance md:text-6xl">Размеры</h2>
          <p className="mb-10 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Корпус высотой 2200 или 2400 мм, сверху — антресоль от 350 до 600 мм: шкаф поднимается до 3000 мм и
            закрывает стену до потолка. Ширину и наполнение секций подбираем под помещение.
          </p>
          <HeightsChart />

          <div className="mt-14 grid gap-10 lg:grid-cols-2">
            {wardrobeSchemes.map((scheme) => (
              <div key={scheme.title}>
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Примеры наполнения секций · {scheme.title}
                </p>
                <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-white p-4">
                  {scheme.images.map((src, i) => (
                    <div key={src} className="relative aspect-[4/7]">
                      <Image src={src} alt={`Схемы наполнения секций, ${scheme.title}, лист ${i + 1}`} fill sizes="(max-width: 1024px) 50vw, 25vw" className="object-contain" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Заявка ── */}
        <section className="pb-16 md:pb-24" aria-labelledby="wardrobes-cta-title">
          <div className="relative">
            <CropMarks />
            <div className="grain flex flex-col gap-6 rounded-3xl border-2 border-primary bg-foreground p-6 text-background md:p-10 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <h2 id="wardrobes-cta-title" className="flyer-title text-3xl text-balance md:text-5xl">
                  Рассчитаем шкаф под вашу нишу
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-background/65 md:text-base">
                  Ответьте на шесть коротких вопросов или запишитесь на замер — подберём коллекцию, цвета и наполнение.
                  Можно заказать шкафы вместе с кухней — в едином стиле.
                </p>
              </div>
              <div className="grid shrink-0 gap-3 sm:grid-cols-2 lg:w-[30rem] [&>*]:whitespace-nowrap">
                <PlanButton href="/quiz?type=wardrobe" onDark>
                  Рассчитать онлайн
                </PlanButton>
                <BookingPlanButton onDark />
                <a
                  href={MAX_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-background/30 px-6 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
                >
                  Написать в Макс
                </a>
                <a
                  href={COMPANY.phoneHref}
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-background/30 px-6 text-sm font-semibold tabular-nums transition-colors hover:border-primary hover:text-primary"
                >
                  {COMPANY.phone}
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
