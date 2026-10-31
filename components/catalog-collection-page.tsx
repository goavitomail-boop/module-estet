import type { ReactNode } from 'react'
import Image from 'next/image'
import type { CatalogRow } from '@/lib/db'
import { CatalogPageHeader } from '@/components/catalog-page-header'
import { PlanButton, PlanLabel } from '@/components/plan'
import { BookingPlanButton } from '@/components/footer-actions'

/**
 * Страница раздела каталога, который ведётся из панели: фасады, столешницы.
 *
 * Позиции приходят одним плоским списком в нужном порядке, а группируются
 * здесь — по названию группы, в порядке первого появления. Так владелец
 * управляет и составом, и очерёдностью из одного списка в панели, не думая
 * про отдельную сущность «группа».
 */
export function CatalogCollectionPage({
  eyebrow,
  keyword,
  title,
  intro,
  items,
  extra,
  details,
}: {
  eyebrow: string
  /** Поисковая строка над заголовком, входит в H1 — см. CatalogPageHeader */
  keyword?: string
  title: string
  intro: string
  items: CatalogRow[]
  /** Раздел после позиций из базы (например, палитры из кода) — попадает и в навигацию шапки */
  extra?: { id: string; title: string; node: ReactNode }
  /**
   * Подробности к позиции — например, её цвета. Позиция с подробностями
   * встаёт широкой строкой: карточка слева, подробности справа, чтобы всё
   * про один фасад читалось в одном месте. Остальные — обычной сеткой
   */
  details?: (item: CatalogRow) => ReactNode
}) {
  const groups = groupItems(items)

  return (
    <main className="min-h-screen bg-background text-foreground">
      <CatalogPageHeader
        eyebrow={eyebrow}
        keyword={keyword}
        title={title}
        intro={intro}
        sections={[...groups.filter((group) => group.title), ...(extra ? [{ id: extra.id, title: extra.title }] : [])]}
        sectionsLabel="Разделы страницы"
        action={<PlanButton href="/quiz" onDark className="w-fit shrink-0">Подобрать под мою кухню</PlanButton>}
      />

      <div className="mx-auto max-w-7xl px-5 md:px-8">
        {groups.map((group, groupIndex) => (
          <section key={group.id} id={group.id} className="scroll-mt-24 border-t border-border py-12 first:border-0">
            {group.title && (
              <div className="mb-8" data-anim="fade-up">
                <PlanLabel index={groupIndex + 1} className="mb-3">Позиций: {group.items.length}</PlanLabel>
                <h2 className="flyer-title text-3xl text-balance text-foreground md:text-5xl">{group.title}</h2>
              </div>
            )}
            <GroupItems items={group.items} details={details} />
          </section>
        ))}

        {extra?.node}

        <section className="border-t border-border py-14" data-anim="fade-up">
          <div className="grain flex flex-col gap-5 rounded-3xl bg-foreground p-8 text-background md:flex-row md:items-center md:justify-between md:p-10">
            <div>
              <p className="flyer-title text-2xl md:text-3xl">Не знаете, что выбрать?</p>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-background/65">
                Дизайнер привезёт образцы на замер и покажет, как они смотрятся в вашем освещении.
              </p>
            </div>
            {/* Раньше кнопка «Записаться на замер» вела в квиз — теперь
                открывает саму форму записи */}
            <BookingPlanButton onDark className="shrink-0" />
          </div>
        </section>
      </div>
    </main>
  )
}

function GroupItems({ items, details }: { items: CatalogRow[]; details?: (item: CatalogRow) => ReactNode }) {
  const rows = items.map((item) => ({ item, extra: details?.(item) ?? null }))
  const detailed = rows.filter((row) => row.extra)
  const plain = rows.filter((row) => !row.extra)

  return (
    <div className="flex flex-col gap-6">
      {detailed.map(({ item, extra }) => (
        <DetailedCard key={item.id} item={item}>{extra}</DetailedCard>
      ))}
      {plain.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4" data-anim="stagger">
          {plain.map(({ item }) => (
            <CatalogCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Позиция вместе с подробностями. Раскладка по ширине:
 * телефон — фото, текст, подробности друг под другом;
 * планшет — фото и текст в ряд, подробности под ними во всю ширину;
 * десктоп — фото и текст слева, подробности справа
 */
function DetailedCard({ item, children }: { item: CatalogRow; children: ReactNode }) {
  return (
    <article
      className="grid gap-x-8 gap-y-5 rounded-2xl border border-border bg-card p-4 [grid-template-areas:'photo'_'text'_'more'] md:grid-cols-[14rem_minmax(0,1fr)] md:p-6 md:[grid-template-areas:'photo_text'_'more_more'] lg:grid-cols-[18rem_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-10 lg:[grid-template-areas:'photo_more'_'text_more']"
      data-anim="fade-up"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted [grid-area:photo]">
        <Image
          src={item.image}
          alt={item.name}
          fill
          sizes="(max-width: 768px) 100vw, 18rem"
          className="object-cover"
          unoptimized={item.image.endsWith('.svg')}
        />
      </div>
      <div className="flex flex-col gap-1 [grid-area:text] md:self-center lg:self-start">
        <h3 className="flyer-title text-2xl text-foreground md:text-3xl">{item.name}</h3>
        {item.meta && <p className="text-sm font-medium leading-relaxed text-foreground/80">{item.meta}</p>}
        {item.description && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>}
      </div>
      <div className="min-w-0 [grid-area:more] md:border-t md:border-border md:pt-5 lg:border-0 lg:pt-0">{children}</div>
    </article>
  )
}

function CatalogCard({ item }: { item: CatalogRow }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/60">
      {/* Пропорция жёстко 4:3 — ровно та, к которой панель приводит каждое
          загруженное фото. Поэтому object-cover здесь ничего не обрезает */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Image
          src={item.image}
          alt={item.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover"
          // Оптимизатор Next отказывается обрабатывать SVG без отдельного
          // разрешения в конфиге, а заглушка — именно SVG. Отдаём её как есть
          unoptimized={item.image.endsWith('.svg')}
        />
      </div>
      <div className="flex flex-col gap-1 p-4">
        <h3 className="font-sans text-base font-semibold text-foreground">{item.name}</h3>
        {item.meta && <p className="text-sm leading-relaxed text-muted-foreground">{item.meta}</p>}
        {item.description && (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground/85">{item.description}</p>
        )}
      </div>
    </article>
  )
}

type Group = { id: string; title: string; items: CatalogRow[] }

/** Группирует по названию, сохраняя порядок первого появления */
function groupItems(items: CatalogRow[]): Group[] {
  const groups: Group[] = []
  const index = new Map<string, Group>()

  for (const item of items) {
    const title = item.group_title.trim()
    let group = index.get(title)
    if (!group) {
      group = { id: `group-${groups.length + 1}`, title, items: [] }
      index.set(title, group)
      groups.push(group)
    }
    group.items.push(item)
  }

  return groups
}
