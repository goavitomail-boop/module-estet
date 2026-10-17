import Link from 'next/link'
import { ArrowDown, ArrowUp, Download, Eye, EyeOff, Images, Pencil, Plus } from 'lucide-react'
import { isDbConfigured, listPortfolioSummaries } from '@/lib/db'
import { portfolioProjects } from '@/lib/portfolio-data'
import {
  importPortfolioAction,
  movePortfolioAction,
  togglePortfolioAction,
} from '@/app/admin/portfolio-actions'
import { plural } from '@/lib/admin-format'
import { EmptyState, Panel } from '../../_components/ui'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Портфолио' }

export default async function PortfolioPage() {
  if (!isDbConfigured()) {
    return (
      <div className="space-y-6">
        <Header />
        <Panel>
          <EmptyState
            title="Нужна база данных"
            hint="Портфолио хранится в той же базе, что и заявки. Пока подключение не задано, галерея показывает проекты из кода, и редактировать их отсюда нельзя."
          />
        </Panel>
      </div>
    )
  }

  const projects = await listPortfolioSummaries()
  const visible = projects.filter((project) => project.published).length

  // Пока база пуста, галерея на сайте показывает проекты из кода. Их можно
  // перенести сюда одним нажатием — и дальше править уже в панели
  if (projects.length === 0) {
    return (
      <div className="space-y-6">
        <Header />
        <Panel title="В базе пока нет проектов">
          <p className="text-sm text-muted-foreground">
            Сейчас в галерее на главной показываются {portfolioProjects.length} проектов, заложенных в код
            сайта. Перенесите их сюда — на сайте ничего не изменится, но каждый проект станет можно
            отредактировать, скрыть или дополнить фотографиями.
          </p>
          <form action={importPortfolioAction} className="mt-4">
            <button
              type="submit"
              className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition hover:opacity-90 md:h-10"
            >
              <Download className="size-4" aria-hidden />
              Перенести {portfolioProjects.length} проектов
            </button>
          </form>
          <p className="mt-4 text-xs text-muted-foreground">
            Можно и не переносить: нажмите «Новый проект», и галерея начнёт показывать только то, что вы
            добавите здесь.
          </p>
        </Panel>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Header />

      <Panel
        title={`${projects.length} ${plural(projects.length, 'проект', 'проекта', 'проектов')} · ${visible} на сайте`}
      >
        <ul className="divide-y divide-border">
          {projects.map((project, index) => (
            <li key={project.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <span className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-secondary sm:size-20">
                {project.cover_src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={project.cover_src} alt="" className="size-full object-cover" />
                ) : (
                  <Images className="absolute inset-0 m-auto size-5 text-muted-foreground" aria-hidden />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Link
                    href={`/admin/portfolio/${project.id}`}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {project.title}
                  </Link>
                  {!project.published && (
                    <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                      скрыт
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {[project.style, project.tag].filter(Boolean).join(' · ') || 'Без описания'}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {project.photo_count} фото{project.area ? ` · ${project.area}` : ''}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <form action={movePortfolioAction}>
                    <input type="hidden" name="id" value={project.id} />
                    <input type="hidden" name="direction" value="up" />
                    <IconSubmit label="Выше" disabled={index === 0}>
                      <ArrowUp className="size-4" aria-hidden />
                    </IconSubmit>
                  </form>
                  <form action={movePortfolioAction}>
                    <input type="hidden" name="id" value={project.id} />
                    <input type="hidden" name="direction" value="down" />
                    <IconSubmit label="Ниже" disabled={index === projects.length - 1}>
                      <ArrowDown className="size-4" aria-hidden />
                    </IconSubmit>
                  </form>
                  <form action={togglePortfolioAction}>
                    <input type="hidden" name="id" value={project.id} />
                    <input type="hidden" name="published" value={project.published ? '0' : '1'} />
                    <IconSubmit label={project.published ? 'Скрыть с сайта' : 'Показать на сайте'}>
                      {project.published ? (
                        <Eye className="size-4" aria-hidden />
                      ) : (
                        <EyeOff className="size-4" aria-hidden />
                      )}
                    </IconSubmit>
                  </form>
                  <Link
                    href={`/admin/portfolio/${project.id}`}
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

      <p className="text-xs text-muted-foreground">
        Порядок в этом списке — это порядок карточек в галерее на главной. Фильтры «Современные», «Классика»
        и «Сканди» собираются по полю «Стиль», а «Небольшие» — по площади до 10 м².
      </p>
    </div>
  )
}

function Header() {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Портфолио</h1>
        <p className="mt-1 text-sm text-muted-foreground">Проекты в галерее «Наши кухни» на главной</p>
      </div>
      <Link
        href="/admin/portfolio/new"
        className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition hover:opacity-90 md:h-10"
      >
        <Plus className="size-4" aria-hidden />
        Новый проект
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
