import Image from 'next/image'
import { Layers3, PanelsTopLeft, Palette, SquareStack } from 'lucide-react'
import { materialCategories, paletteSwatches } from '@/lib/materials-data'
import { PlanLabel, PlanTag } from '@/components/plan'
import { DecorSamples } from '@/components/decor-samples'
import { ModuleLayers } from '@/components/module-layers'

const icons = [SquareStack, Layers3, PanelsTopLeft, Palette]

export function MaterialsSection() {
  return (
    <section id="materials" className="grain bg-foreground py-16 text-background md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="flex flex-col gap-8 border-b border-primary/30 pb-10 md:flex-row md:items-end md:justify-between" data-anim>
          <div className="max-w-3xl">
            <PlanLabel index={4} className="mb-4">Из чего создаём кухни</PlanLabel>
            <h2 className="flyer-title mt-2 text-balance text-3xl text-background md:text-5xl">
              Материалы, которые работают на красоту и долговечность
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-background/65">
            Подбираем поверхность, фасады и оттенки как единую композицию — с учётом интерьера, привычек и бюджета.
          </p>
        </div>

        <div className="relative mb-8 mt-8 overflow-hidden rounded-3xl border border-primary/30 md:mt-10" data-anim="image">
          <div className="relative aspect-[5/4] sm:aspect-[16/7]">
            <Image
              src="/images/materials-hero.webp"
              alt="Премиальные материалы, образцы фасадов, столешниц и фактур МДФ Модуль Эстет"
              fill
              sizes="(max-width: 768px) 100vw, 1152px"
              className="object-cover"
              priority
              data-anim="parallax"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/50 to-transparent" />
            <PlanTag title="На фото" value="Образцы фасадов и фурнитуры" dot className="absolute right-4 top-4 md:right-6 md:top-6" />
            <div className="absolute inset-x-0 bottom-0 flex items-end p-6 md:inset-y-0 md:left-0 md:right-auto md:max-w-md md:p-10">
              <p className="text-balance text-lg font-bold leading-snug text-background md:text-2xl">
                Собираем кухню как цельную композицию — от основы корпуса до оттенка поверхности
              </p>
            </div>
          </div>
        </div>

        <ul className="grid gap-px overflow-hidden rounded-3xl bg-primary/30 sm:grid-cols-2 lg:grid-cols-4" data-anim="stagger">
          {materialCategories.map((category, index) => {
            const Icon = icons[index]
            return (
              <li key={category.id} className="plan-hoverline group flex min-h-72 flex-col bg-foreground p-6 md:p-7">
                <div className="relative mb-4 h-36 w-full overflow-hidden rounded-2xl border border-primary/20 bg-background/5">
                  <Image
                    src={category.image}
                    alt={category.imageAlt}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Номер позиции + иконка — бирка как на первом экране */}
                  <span className="plan-tag plan-tag--row absolute left-3 top-3">
                    <Icon className="size-3.5 text-primary" strokeWidth={2} aria-hidden="true" />
                    <span className="plan-tag__value tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                  </span>
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-primary">{category.eyebrow}</p>
                <h3 className="flyer-title mt-1 text-xl text-background">{category.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-background/65">{category.summary}</p>
                {category.id === 'palette' && (
                  <div className="mt-auto pt-4">
                    <DecorSamples samples={paletteSwatches} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        {/* Нижний модуль по слоям: столешница, каркас, задняя стенка, фасад */}
        <div className="mt-8 rounded-3xl bg-background p-5 text-foreground md:p-8" data-anim>
          <ModuleLayers />
        </div>
      </div>
    </section>
  )
}
