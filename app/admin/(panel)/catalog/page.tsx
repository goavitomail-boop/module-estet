import Link from 'next/link'
import { ArrowDown, ArrowUp, ExternalLink, Eye, EyeOff, Pencil, Plus, Sparkles } from 'lucide-react'
import {
  CATALOG_SECTIONS,
  countCatalogBySection,
  isCatalogSection,
  isDbConfigured,
  listCatalogItems,
  type CatalogSection,
} from '@/lib/db'
import { catalogSeed } from '@/lib/catalog-seed'
import { moveCatalogAction, seedCatalogAction, toggleCatalogAction } from '@/app/admin/catalog-actions'
import { plural } from '@/lib/admin-format'
import { cn } from '@/lib/utils'
import { EmptyState, Panel } from '../../_components/ui'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Каталог' }

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>
}) {
  const params = await searchParams
  const section: CatalogSection = isCatalogSection(params.section ?? '')
    ? (params.section as CatalogSection)
    : 'filling'

  if (!isDbConfigured()) {
    return (
      <div className="space-y-6">
        <Header section={section} />
        <Panel>
          <EmptyState
            title="Нужна база данных"
            hint="Каталог хранится в той же базе, что и заявки. Пока подключение не задано, страницы показывают только то, что заложено в код."
          />
        </Panel>
      </div>
    )
  }

  const [items, counts] = await Promise.all([
    listCatalogItems(section, { includeHidden: true }),
    countCatalogBySection(),
  ])
  const visible = items.filter((item) => item.published).length
  const current = CATALOG_SECTIONS.find((entry) => entry.value === section)!
  const seedSize = catalogSeed(section).length

  return (
    <div className="space-y-6">
      <Header section={section} />

      <nav className="flex flex-wrap gap-2" aria-label="Разделы каталога">
        {CATALOG_SECTIONS.map((entry) => {
          const active = entry.value === section
          return (
            <Link
              key={entry.value}
              href={`/admin/catalog?section=${entry.value}`}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'inline-flex h-11 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition md:h-9',
                active
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-card hover:bg-secondary'
              )}
            >
              {entry.label}
              <span className={cn('tabular-nums', active ? 'opacity-70' : 'text-muted-foreground')}>
                {counts[entry.value] ?? 0}
              </span>
            </Link>
          )
        })}
      </nav>

      {items.length === 0 ? (
        <Panel title={section === 'filling' ? 'Наполнение ещё не перенесено' : `Раздел «${current.label}» пуст`}>
          <p className="text-sm text-muted-foreground">
            {section === 'filling'
              ? `Страница ${current.path} сейчас показывает каталог производства, заложенный в код, — его нельзя править отсюда. Перенесите позиции в панель: страница не изменится, но каждую можно будет отредактировать, скрыть или заменить ей фото.`
              : `Страница ${current.path} появится, как только в разделе будет хотя бы одна позиция.`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {seedSize > 0 && (
              <form action={seedCatalogAction}>
                <input type="hidden" name="section" value={section} />
                <button
                  type="submit"
                  className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition hover:opacity-90 md:h-10"
                >
                  <Sparkles className="size-4" aria-hidden />
                  {section === 'filling'
                    ? `Перенести ${seedSize} позиций в панель`
                    : `Заполнить черновиком (${seedSize})`}
                </button>
              </form>
            )}
            <Link
              href={`/admin/catalog/new?section=${section}`}
              className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-border px-4 text-sm font-medium transition hover:bg-secondary md:h-10"
            >
              <Plus className="size-4" aria-hidden />
              Добавить свою позицию
            </Link>
          </div>
          {seedSize > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              {section === 'filling'
                ? 'Перенесутся все позиции страницы вместе с фотографиями и описаниями групп. Шесть позиций из каталога, которых сейчас на странице нет (петли, ящики, сушилка, лотки), заведутся скрытыми — включите их галочкой, если нужны.'
                : 'Черновик заведёт позиции с названиями и характеристиками из каталога производства, но с заглушкой вместо фото. Дальше останется открыть каждую и загрузить снимок.'}
            </p>
          )}
        </Panel>
      ) : (
        <Panel
          title={`${items.length} ${plural(items.length, 'позиция', 'позиции', 'позиций')} · ${visible} на сайте`}
          action={
            <a
              href={current.path}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
            >
              Открыть страницу
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          }
        >
          <ul className="divide-y divide-border">
            {items.map((item, index) => (
              <li key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <span className="relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-lg bg-secondary sm:w-24">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image} alt="" className="size-full object-cover" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link
                      href={`/admin/catalog/${item.id}`}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {item.name}
                    </Link>
                    {!item.published && (
                      <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                        скрыта
                      </span>
                    )}
                  </div>
                  {item.meta && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.meta}</p>
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.group_title || 'Без группы'}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <form action={moveCatalogAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="section" value={section} />
                      <input type="hidden" name="direction" value="up" />
                      <IconSubmit label="Выше" disabled={index === 0}>
                        <ArrowUp className="size-4" aria-hidden />
                      </IconSubmit>
                    </form>
                    <form action={moveCatalogAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="section" value={section} />
                      <input type="hidden" name="direction" value="down" />
                      <IconSubmit label="Ниже" disabled={index === items.length - 1}>
                        <ArrowDown className="size-4" aria-hidden />
                      </IconSubmit>
                    </form>
                    <form action={toggleCatalogAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="section" value={section} />
                      <input type="hidden" name="published" value={item.published ? '0' : '1'} />
                      <IconSubmit label={item.published ? 'Скрыть со страницы' : 'Показать на странице'}>
                        {item.published ? (
                          <Eye className="size-4" aria-hidden />
                        ) : (
                          <EyeOff className="size-4" aria-hidden />
                        )}
                      </IconSubmit>
                    </form>
                    <Link
                      href={`/admin/catalog/${item.id}`}
                      className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium transition hover:bg-secondary md:h-9"
                    >
                      <Pencil className="size-3.5" aria-hidden />
                      Редактировать
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <p className="text-xs text-muted-foreground">
        Порядок в списке — это порядок карточек на странице. Позиции с одинаковым названием группы
        встают под общим заголовком, в том же порядке.
      </p>
    </div>
  )
}

function Header({ section }: { section: CatalogSection }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Каталог</h1>
        <p className="mt-1 text-sm text-muted-foreground">Наполнение, фасады и столешницы на сайте</p>
      </div>
      <Link
        href={`/admin/catalog/new?section=${section}`}
        className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition hover:opacity-90 md:h-10"
      >
        <Plus className="size-4" aria-hidden />
        Новая позиция
      </Link>
    </header>
  )
}

function IconSubmit({
  label,
  children,
  disabled = false,
}: {
  label: string
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex size-11 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-40 md:size-9"
    >
      {children}
    </button>
  )
}
