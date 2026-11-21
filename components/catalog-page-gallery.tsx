'use client'

import Image from 'next/image'
import {
  collections,
  fillingSections,
  materials,
  type CatalogGroup,
  type CatalogItem,
} from '@/lib/pdf-catalog-data'
import { CatalogPageHeader } from '@/components/catalog-page-header'
import { GroupScheme } from '@/components/catalog-schemes'
import { FacadePalette } from '@/components/facade-palette'
import { PlanLabel, PlanTag } from '@/components/plan'
import { StorageCard } from '@/components/storage-card'

type Section = 'collections' | 'materials' | 'filling'

/** Фото, загруженные из панели, уже приведены к 4:3 — их не надо подгонять */
function isNormalized(image: string): boolean {
  return image.startsWith('/media/catalog/') || image.endsWith('/catalog-placeholder.svg')
}

/** Системы хранения — своя карточка (storage-card.tsx): схема механизма и фото */
function isStoragePhoto(image: string): boolean {
  return image.startsWith('/catalog/storage/')
}

function ItemCard({ item, contain = false }: { item: CatalogItem; contain?: boolean }) {
  const normalized = isNormalized(item.image)
  const isHandlePhoto = !normalized && item.image.startsWith('https://') && !item.meta?.startsWith('Конструктив')
  const isLightingPhoto = !normalized && item.image.includes('/lighting/')
  const isConstructive = !normalized && item.meta?.startsWith('Конструктив')

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/60">
      <div
        className={
          isHandlePhoto
            ? 'relative aspect-[3/2] overflow-hidden bg-muted'
            : isConstructive
              ? 'relative aspect-[4/3] overflow-hidden bg-background'
              : 'relative aspect-[4/3] overflow-hidden bg-muted'
        }
      >
        <Image
          src={item.image}
          alt={item.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          unoptimized={item.image.endsWith('.svg')}
          className={
            normalized
              ? 'object-cover'
              : isConstructive
                ? 'object-contain p-6'
                : isHandlePhoto
                  ? 'object-cover object-top scale-[1.28] origin-top'
                  : isLightingPhoto
                    ? 'object-cover object-[center_24%] scale-[1.22] origin-center'
                    : contain
                      ? 'object-contain p-3'
                      : 'object-cover'
          }
        />
      </div>
      <div className="flex flex-col gap-1 p-4">
        <h3 className="font-sans text-base font-semibold text-foreground">{item.name}</h3>
        {item.meta && <p className="text-sm leading-relaxed text-muted-foreground">{item.meta}</p>}
      </div>
    </article>
  )
}

function GroupBlock({ group, index }: { group: CatalogGroup; index: number }) {
  return (
    <section id={group.id} className="scroll-mt-24 border-t border-border py-12 first:border-0">
      <div className="mb-8 grid gap-5 md:grid-cols-[0.75fr_1.25fr]">
        <div>
          <PlanLabel index={index + 1} className="mb-3">{group.eyebrow}</PlanLabel>
          <h2 className="flyer-title text-3xl text-balance text-foreground md:text-5xl">{group.title}</h2>
        </div>
        <div className="flex flex-col gap-4">
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">{group.description}</p>
          {group.specs && (
            <div className="flex flex-wrap gap-2">
              {/* Характеристики — строками спецификации с латунной точкой */}
              {group.specs.map((spec) => (
                <span key={spec} className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm text-foreground">
                  <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  {spec}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Схема раздела в каркасе — если она для раздела есть (catalog-schemes.tsx) */}
      <GroupScheme group={group} />
      {group.hero && (
        <div className="relative mb-6 aspect-[16/7] overflow-hidden rounded-2xl bg-muted">
          <Image src={group.hero} alt={group.title} fill sizes="100vw" className="object-cover" />
          <PlanTag title="Раздел" value={group.title} dot className="absolute bottom-4 left-4" />
        </div>
      )}
      {group.gallery && group.gallery.length > 0 && (
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {group.gallery.map((photo) => (
            <div key={photo.image} className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
              <Image src={photo.image} alt={photo.alt} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />
            </div>
          ))}
        </div>
      )}
      {group.items && group.layout === 'swatches' && (
        <FacadePalette items={group.items} shape={group.shape} shapeAlt={`Форма фасада ${group.title}`} note={group.paletteNote} />
      )}
      {group.items && group.layout !== 'swatches' && group.items.every((item) => isStoragePhoto(item.image)) && (
        // Систем хранения шесть — в три колонки они встают двумя ровными рядами
        <div className="grid gap-5 md:grid-cols-3" data-anim="stagger">
          {group.items.map((item, i) => (
            <StorageCard key={`${item.name}-${i}`} item={item} index={i} />
          ))}
        </div>
      )}
      {group.items && group.layout !== 'swatches' && !group.items.every((item) => isStoragePhoto(item.image)) && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {group.items.map((item, i) => (
            <ItemCard
              key={`${item.name}-${i}`}
              item={item}
              contain={!item.image.includes('/facades/') && !item.image.includes('/slotex/') && !item.image.includes('/mdf/')}
            />
          ))}
        </div>
      )}
    </section>
  )
}

/**
 * groups — разделы, пришедшие из базы. Если они есть, каталог из кода
 * не показывается вовсе: после переноса в панель источник должен быть один,
 * иначе страница задвоится.
 */
export function CatalogPageGallery({
  section,
  groups,
}: {
  section: Section
  groups?: CatalogGroup[]
}) {
  const config =
    section === 'collections'
      ? {
          eyebrow: 'Фасады',
          keyword: 'Кухни на заказ в Москве: коллекции фасадов',
          title: 'Коллекции кухонь',
          intro: 'Шесть коллекций фасадов: цвета и декоры, реальные интерьеры и технические данные из каталога производства.',
          groups: groups ?? collections,
        }
      : section === 'materials'
        ? {
            eyebrow: 'Материалы',
            keyword: 'Материалы для кухни на заказ',
            title: 'Поверхности и декоры',
            intro: 'Корпус, фасадные системы, витрины и оригинальные текстуры SLOTEX с артикулами.',
            groups: groups ?? materials,
          }
        : {
            eyebrow: 'Фурнитура и детали',
            keyword: 'Фурнитура и наполнение для кухни',
            title: 'Наполнение и фурнитура',
            intro: 'LED-подсветка рабочей зоны, выдвижные системы хранения, коллекции ручек всех типов и технический конструктив кухонных корпусов.',
            groups: groups ?? fillingSections,
          }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <CatalogPageHeader
        eyebrow={config.eyebrow}
        keyword={config.keyword}
        title={config.title}
        intro={config.intro}
        sections={config.groups}
        sectionsLabel="Разделы каталога"
        // Кнопки «Открыть исходный PDF» здесь больше нет: файла на сайте не
        // было, и ссылка вела на страницу «не найдено»
      />

      <div className="mx-auto max-w-7xl px-5 md:px-8">
        {config.groups.map((group, index) => (
          <GroupBlock key={group.id} group={group} index={index} />
        ))}
      </div>
    </main>
  )
}
