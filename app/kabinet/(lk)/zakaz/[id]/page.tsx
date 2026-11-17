import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import {
  ArrowLeft,
  CalendarPlus,
  Camera,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  Hammer,
  MapPin,
  MessageSquareText,
  Phone,
  Ruler,
  Truck,
  Users,
} from 'lucide-react'
import { requireClient } from '@/lib/cabinet-auth'
import { getOrder, listFeed, listOrderFiles, listVisits } from '@/lib/cabinet-db'
import {
  ORDER_STAGES,
  PROJECT_STATUS,
  fileKind,
  formatDay,
  formatTime,
  isProjectStatus,
  productLabel,
  productionProgress,
  stageIndex,
  visitKindLabel,
  type OrderFeedItem,
} from '@/lib/cabinet-shared'
import { COMPANY } from '@/lib/company'
import { formatFileSize, timeAgo } from '@/lib/admin-format'
import { EmptyState, Panel } from '@/app/admin/_components/ui'
import { StageTrack } from '../../../_components/stage-track'
import { PhotoGallery } from '../../../_components/photo-gallery'
import { AskManager, ProjectApproval, RescheduleButton } from '../../../_components/order-actions'
import { cn } from '@/lib/utils'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = await getOrder(id).catch(() => null)
  return { title: order?.title ?? 'Заказ' }
}

const VISIT_ICONS = { measurement: Ruler, meeting: Users, delivery: Truck, installation: Hammer } as const

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const client = await requireClient()
  const { id } = await params
  const order = await getOrder(id)
  // Чужой заказ — такой же «не найден», как несуществующий
  if (!order || order.client_id !== client.id) notFound()

  const [visits, files, feed] = await Promise.all([listVisits(order.id), listOrderFiles(order.id, true), listFeed(order.id, 30)])

  const now = Date.now()
  const upcoming = visits.filter((v) => new Date(v.starts_at).getTime() > now - 3 * 3600_000)
  const renders = files.filter((f) => fileKind(f.kind).group === 'project' && f.content_type.startsWith('image/'))
  const photos = files.filter((f) => fileKind(f.kind).group === 'photo' && f.content_type.startsWith('image/'))
  const docs = files.filter((f) => !renders.includes(f) && !photos.includes(f))
  const stage = ORDER_STAGES[stageIndex(order.stage)]
  const progress = order.stage === 'production' ? productionProgress(order) : null
  const project = isProjectStatus(order.project_status) ? order.project_status : 'none'
  const hasProject = renders.length > 0 || order.spec.length > 0 || project !== 'none'

  return (
    <div className="space-y-6">
      <Link
        href="/kabinet"
        className="-my-2 inline-flex min-h-11 items-center gap-1.5 py-2 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Все заказы
      </Link>

      {/* ── Главное: что за заказ и где он сейчас ── */}
      <section className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm sm:p-7">
        <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
        <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-accent-foreground">
          <span className="h-px w-5 bg-primary" aria-hidden />
          {productLabel(order.product)}
        </p>
        <h1 className="admin-display mt-1.5 text-[1.75rem] leading-[1.1] sm:text-[2.1rem]">{order.title}</h1>
        {order.address && (
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-4 shrink-0" aria-hidden />
            {order.address}
          </p>
        )}

        <div className="mt-7">
          <StageTrack stage={order.stage} />
        </div>

        <div className="mt-6 rounded-lg bg-secondary/60 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            {order.stage === 'done' && <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />}
            Сейчас: {stage.label}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{stage.hint}</p>
          {progress && (
            <div className="mt-3">
              <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                <span>
                  Прошло <strong className="text-foreground tabular-nums">{progress.passed}</strong> из {progress.total} дней
                </span>
                {order.ready_date && (
                  <span>
                    готовность — <strong className="text-foreground">{formatDay(order.ready_date)}</strong>
                  </span>
                )}
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-border">
                <div className="admin-bar-x h-full rounded-full bg-primary" style={{ width: `${Math.max(progress.share * 100, 3)}%` }} />
              </div>
            </div>
          )}
          {!progress && order.ready_date && order.stage !== 'done' && (
            <p className="mt-2 text-xs text-muted-foreground">
              Плановая готовность: <strong className="text-foreground">{formatDay(order.ready_date)}</strong>
            </p>
          )}
        </div>
      </section>

      {/* ── Проект ждёт ответа — самое срочное, поэтому сразу под этапом ── */}
      {project === 'sent' && (
        <section className="admin-pop rounded-xl border border-primary/50 bg-gradient-to-br from-primary/15 to-primary/5 p-5 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <span className="admin-pulse !bg-primary" aria-hidden />
            Проект готов и ждёт вашего согласования
          </p>
          <p className="mb-4 mt-1 text-sm leading-relaxed text-muted-foreground">
            Посмотрите визуализации и спецификацию ниже. Если всё нравится — согласуйте, если нет — напишите,
            что поправить.
          </p>
          <ProjectApproval orderId={order.id} />
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {hasProject && (
            <Panel
              title="Проект"
              action={
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-medium',
                    project === 'approved' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-secondary text-muted-foreground'
                  )}
                >
                  {PROJECT_STATUS[project]}
                </span>
              }
            >
              {renders.length > 0 && (
                <PhotoGallery
                  photos={renders.map((f) => ({ id: f.id, caption: f.caption, date: '' }))}
                  aspect="aspect-[4/3]"
                />
              )}
              {order.spec.length > 0 && (
                <dl className={cn('divide-y divide-border', renders.length > 0 && 'mt-5')}>
                  {order.spec.map((row, index) => (
                    <div key={`${row.label}-${index}`} className="grid gap-1 py-2.5 first:pt-0 last:pb-0 sm:grid-cols-[160px_1fr] sm:gap-4">
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground sm:pt-0.5">{row.label}</dt>
                      <dd className="text-sm">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {renders.length === 0 && order.spec.length === 0 && (
                <p className="text-sm text-muted-foreground">Дизайнер работает над проектом — визуализации появятся здесь.</p>
              )}
            </Panel>
          )}

          <Panel
            title={
              <span className="flex items-center gap-2">
                <Camera className="size-4 text-muted-foreground" aria-hidden />
                Фотоотчёт
              </span>
            }
            action={photos.length > 0 ? <span className="text-xs text-muted-foreground">{photos.length} фото</span> : undefined}
          >
            {photos.length > 0 ? (
              <PhotoGallery
                photos={photos.map((f) => ({ id: f.id, caption: f.caption, date: formatDay(f.created_at) }))}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Когда заказ уйдёт в производство, сюда будут приходить фото корпусов и фасадов, а потом — сборки
                у вас дома.
              </p>
            )}
          </Panel>

          <Panel
            title={
              <span className="flex items-center gap-2">
                <ClipboardList className="size-4 text-muted-foreground" aria-hidden />
                Что происходило
              </span>
            }
          >
            {feed.length === 0 ? (
              <p className="text-sm text-muted-foreground">Здесь появятся новости по заказу.</p>
            ) : (
              <ol className="admin-timeline space-y-4 pl-5">
                {feed.map((item, index) => (
                  <FeedEntry key={item.id} item={item} index={index} />
                ))}
              </ol>
            )}
          </Panel>
        </div>

        {/* ── Справа: визиты, документы, менеджер ── */}
        <aside className="space-y-6">
          <Panel title="Ближайшие визиты">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Сейчас ничего не запланировано. Менеджер согласует время заранее.</p>
            ) : (
              <ul className="space-y-4">
                {upcoming.map((visit) => {
                  const Icon = VISIT_ICONS[visit.kind as keyof typeof VISIT_ICONS] ?? CalendarPlus
                  const date = new Date(visit.starts_at)
                  return (
                    <li key={visit.id} className="flex gap-3">
                      <span className="flex w-12 shrink-0 flex-col items-center rounded-lg border border-border bg-background py-1.5 text-center">
                        <span className="admin-num text-xl leading-none">
                          {date.toLocaleDateString('ru-RU', { day: 'numeric', timeZone: 'Europe/Moscow' })}
                        </span>
                        <span className="mt-0.5 text-[10px] uppercase text-muted-foreground">
                          {date.toLocaleDateString('ru-RU', { month: 'short', timeZone: 'Europe/Moscow' }).replace('.', '')}
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-sm font-semibold">
                          <Icon className="size-4 text-accent-foreground" aria-hidden />
                          {visitKindLabel(visit.kind)}
                        </p>
                        <p className="text-xs text-muted-foreground first-letter:uppercase">
                          {date.toLocaleDateString('ru-RU', { weekday: 'long', timeZone: 'Europe/Moscow' })}, {formatTime(visit.starts_at)}
                        </p>
                        {visit.note && <p className="mt-1 text-xs leading-relaxed">{visit.note}</p>}
                        <div className="-ml-3 mt-1 flex flex-wrap items-start">
                          <a
                            href={`/kabinet/ics/${visit.id}`}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                          >
                            <CalendarPlus className="size-3.5" aria-hidden />В календарь
                          </a>
                          <RescheduleButton visitId={visit.id} />
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>

          <Panel title="Документы">
            {docs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Договор, проект и счета появятся здесь.</p>
            ) : (
              <ul className="-my-1 divide-y divide-border">
                {docs.map((file) => (
                  <li key={file.id}>
                    <a
                      href={`/kabinet/file/${file.id}?download=1`}
                      className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-secondary/70"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                        <FileText className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{file.caption || file.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {fileKind(file.kind).label} · {formatFileSize(Number(file.size))}
                        </span>
                      </span>
                      <Download className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-y-0.5" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Ваш менеджер">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
                {(order.manager_name || 'МЭ')
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((p) => p[0])
                  .join('')
                  .toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{order.manager_name || 'Отдел заказов'}</p>
                <p className="text-xs text-muted-foreground">«Модуль Эстет»</p>
              </div>
            </div>
            <a
              href={`tel:${(order.manager_phone || COMPANY.phone).replace(/[^\d+]/g, '')}`}
              className="admin-press mt-4 flex h-11 items-center justify-center gap-2 rounded-lg bg-foreground text-sm font-medium text-background hover:opacity-90"
            >
              <Phone className="size-4" aria-hidden />
              {order.manager_phone || COMPANY.phone}
            </a>
            <div className="mt-4 border-t border-border pt-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <MessageSquareText className="size-3.5" aria-hidden />
                Написать
              </p>
              <AskManager orderId={order.id} />
            </div>
          </Panel>
        </aside>
      </div>

      {feed.length === 0 && docs.length === 0 && photos.length === 0 && !hasProject && upcoming.length === 0 && (
        <EmptyState title="Заказ только начался" hint="По мере работы здесь появятся проект, документы, визиты и фото." />
      )}
    </div>
  )
}

const FEED_DOT: Record<string, string> = {
  stage: 'bg-primary',
  approved: 'bg-emerald-500',
  changes: 'bg-amber-500',
  question: 'bg-sky-500',
  reschedule: 'bg-amber-500',
}

function FeedEntry({ item, index }: { item: OrderFeedItem; index: number }) {
  const fromClient = item.actor === 'client'
  return (
    <li className="relative" style={{ '--i': index } as CSSProperties}>
      <span className={cn('absolute -left-[25px] top-1.5 size-2.5 rounded-full ring-4 ring-card', FEED_DOT[item.kind] ?? 'bg-border')} />
      <p className="text-sm leading-relaxed">
        {fromClient && <span className="font-medium">Вы: </span>}
        {item.text}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(item.created_at)}</p>
    </li>
  )
}
