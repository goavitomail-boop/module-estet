import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  Clock,
  FileText,
  FolderOpen,
  Globe,
  MapPin,
  MessageSquare,
  Monitor,
  Paperclip,
  Phone,
  Repeat2,
  User,
} from 'lucide-react'
import {
  countLeadsByPhone,
  getLead,
  getSlotOccupancy,
  isDbConfigured,
  listKnownManagers,
  listLeadEvents,
  listLeadUploads,
  type LeadEvent,
} from '@/lib/db'
import { BOOKING_HORIZON_DAYS, moscowToday, slotCapacity } from '@/lib/measurement-slots'
import {
  detailSections,
  deviceFromUserAgent,
  formatDateTime,
  formatFileSize,
  hoursSince,
  leadFileHref,
  leadFiles,
  leadSource,
  prettyPhone,
  statusText,
  telHref,
  timeAgo,
} from '@/lib/admin-format'
import { EmptyState, Panel, StatusBadge, TypeBadge } from '../../../_components/ui'
import { deleteLeadAction } from '@/app/admin/actions'
import { DeleteLeadButton } from './delete-button'
import { LeadActions } from './lead-actions'
import { ManagerFiles } from './manager-files'
import { PrintButton } from './print-button'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return { title: `Заявка ${decodeURIComponent(id)}` }
}

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params
  const id = decodeURIComponent(rawId)

  if (!isDbConfigured()) {
    return <EmptyState title="Нет подключения к базе" hint="Карточка заявки недоступна без DATABASE_URL." />
  }

  const lead = await getLead(id)
  if (!lead) notFound()

  // Занятость нужна только для переноса замера — для заявок на проект не грузим
  const today = moscowToday()
  const horizonDate = new Date(`${today}T00:00:00Z`)
  horizonDate.setUTCDate(horizonDate.getUTCDate() + BOOKING_HORIZON_DAYS)

  const [events, managers, leadsFromClient, occupancy, uploads] = await Promise.all([
    listLeadEvents(id),
    listKnownManagers(),
    countLeadsByPhone(lead.phone_digits),
    lead.type === 'measurement'
      ? getSlotOccupancy(today, horizonDate.toISOString().slice(0, 10))
      : Promise.resolve({}),
    listLeadUploads(id),
  ])
  const sections = detailSections(lead)
  const files = leadFiles(lead)
  const age = hoursSince(lead.created_at)
  const overdue = lead.status === 'new' && age > 2

  return (
    <div className="space-y-6">
      {/* -my-2 компенсирует добавленные отступы: зона касания растёт,
          а расстояние до соседних блоков остаётся прежним */}
      <Link
        href="/admin/leads"
        className="-my-2 inline-flex min-h-11 items-center gap-1.5 py-2 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        К списку заявок
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-mono text-xl font-semibold tracking-tight">{lead.id}</h1>
            <StatusBadge status={lead.status} />
            <TypeBadge type={lead.type} />
            {overdue && (
              <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                Просрочена
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Создана {formatDateTime(lead.created_at)} · {timeAgo(lead.created_at)}
          </p>
        </div>

        {/* На телефоне кнопки во всю ширину — главные действия в карточке */}
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row print:hidden">
          <a
            href={telHref(lead.phone)}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-foreground px-5 text-sm font-medium text-background transition hover:opacity-90 active:opacity-80 sm:h-11 sm:w-auto"
          >
            <Phone className="size-4" aria-hidden />
            Позвонить {prettyPhone(lead.phone)}
          </a>
          <PrintButton />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ── Левая колонка: данные заявки ── */}
        <div className="space-y-6">
          <Panel title="Контакты">
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Row icon={User} label="Имя" value={lead.name} />
              <Row
                icon={Phone}
                label="Телефон"
                value={
                  <a
                    href={telHref(lead.phone)}
                    className="-my-2 inline-flex min-h-11 items-center py-2 tabular-nums hover:text-primary hover:underline"
                  >
                    {prettyPhone(lead.phone)}
                  </a>
                }
              />
            </dl>

            {/* Повторное обращение — знать об этом до звонка важнее всего:
                у клиента уже есть история, и начинать разговор с нуля нельзя */}
            {leadsFromClient > 1 && (
              <Link
                href={`/admin/clients/${encodeURIComponent(lead.phone_digits)}`}
                className="mt-4 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm transition hover:bg-primary/10"
              >
                <Repeat2 className="size-4 shrink-0 text-accent-foreground" aria-hidden />
                <span>
                  Это <strong>{leadsFromClient}-е</strong> обращение с этого номера
                </span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">Вся история →</span>
              </Link>
            )}
          </Panel>

          {sections.map((section) => (
            <Panel key={section.title} title={section.title}>
              <dl className="grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
                {section.rows.map((row) => (
                  <div key={row.label} className="min-w-0">
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{row.label}</dt>
                    <dd className="mt-1 break-words text-sm text-foreground">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
          ))}

          {files.length > 0 && (
            <Panel
              title={
                <span className="flex items-center gap-2">
                  <Paperclip className="size-4" aria-hidden />
                  Файлы клиента — {files.length}
                </span>
              }
            >
              <ul className="grid gap-3 sm:grid-cols-2">
                {files.map((file, index) => {
                  const isImage = file.type?.startsWith('image/')
                  const href = leadFileHref(file)
                  const downloadHref = leadFileHref(file, true)
                  return (
                    <li
                      key={`${file.name}-${index}`}
                      className="overflow-hidden rounded-lg border border-border bg-background"
                    >
                      {href && isImage ? (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="block">
                          {/* Файл приходит из приватного хранилища через наш маршрут,
                              оптимизатор next/image здесь не нужен и не поможет */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={href}
                            alt={file.name}
                            className="h-40 w-full bg-secondary object-cover transition hover:opacity-90"
                          />
                        </a>
                      ) : (
                        <div className="flex h-40 items-center justify-center bg-secondary">
                          <FileText className="size-8 text-muted-foreground" aria-hidden />
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium" title={file.name}>
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                        </div>
                        {downloadHref ? (
                          <a
                            href={downloadHref}
                            className="shrink-0 text-xs font-medium text-primary hover:underline"
                          >
                            Скачать
                          </a>
                        ) : (
                          <span className="shrink-0 text-xs text-destructive" title="Загрузка не удалась">
                            нет файла
                          </span>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
              {files.some((f) => !leadFileHref(f)) && (
                <p className="mt-3 text-xs text-muted-foreground">
                  У части файлов нет ссылки — загрузка в хранилище не удалась. Запросите их у клиента при звонке.
                </p>
              )}
            </Panel>
          )}

          {/* Файлы компании — отдельно от клиентских: их добавляют и удаляют
              в работе, и по каждому видно, кто и когда положил */}
          <Panel
            title={
              <span className="flex items-center gap-2">
                <FolderOpen className="size-4" aria-hidden />
                Документы по заявке{uploads.length > 0 ? ` — ${uploads.length}` : ''}
              </span>
            }
            className="print:hidden"
          >
            <ManagerFiles leadId={lead.id} files={uploads} />
          </Panel>

          <Panel
            title={
              <span className="flex items-center gap-2">
                <MessageSquare className="size-4" aria-hidden />
                История заявки
              </span>
            }
          >
            <Timeline events={events} createdAt={lead.created_at} status={lead.status} />
          </Panel>

          <Panel
            title={
              <span className="flex items-center gap-2">
                <Globe className="size-4" aria-hidden />
                Технические данные
              </span>
            }
          >
            <dl className="grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
              <Row icon={MapPin} label="Источник" value={leadSource(lead)} />
              <Row icon={Monitor} label="Устройство" value={deviceFromUserAgent(lead.user_agent)} />
              {lead.landing_page && <Row label="Страница входа" value={lead.landing_page} mono />}
              {lead.referrer && <Row label="Переход с" value={lead.referrer} mono />}
              {lead.utm?.campaign && <Row label="Кампания" value={lead.utm.campaign} />}
              {lead.utm?.medium && <Row label="Канал (medium)" value={lead.utm.medium} />}
              {lead.utm?.term && <Row label="Ключевое слово" value={lead.utm.term} />}
              {lead.utm?.content && <Row label="Объявление" value={lead.utm.content} />}
              <Row label="IP-адрес" value={lead.ip ?? '—'} mono />
              <Row
                icon={Clock}
                label="Первый ответ"
                value={
                  lead.first_response_at
                    ? `${formatDateTime(lead.first_response_at)} (${timeAgo(lead.first_response_at)})`
                    : 'ещё не было'
                }
              />
            </dl>
          </Panel>
        </div>

        {/* ── Правая колонка: действия. На печати не нужна — на бумаге кнопки не нажимаются ── */}
        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start print:hidden">
          <LeadActions lead={lead} managers={managers} occupancy={occupancy} capacity={slotCapacity()} />

          <section className="rounded-xl border border-destructive/30 bg-card p-4 shadow-sm md:p-5">
            <h2 className="text-sm font-semibold">Удалить заявку</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Для спама, дублей и тестовых заявок. Вместе с заявкой удалятся история, заметки и файлы — отменить
              это нельзя. Если клиент просто отказался, лучше поставьте статус «Отказ»: так заявка останется в
              аналитике.
            </p>
            <form action={deleteLeadAction} className="mt-3">
              <input type="hidden" name="id" value={lead.id} />
              <DeleteLeadButton leadId={lead.id} />
            </form>
          </section>
        </div>
      </div>
    </div>
  )
}

function Row({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon?: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="size-3.5" aria-hidden />}
        {label}
      </dt>
      <dd className={`mt-1 break-all text-sm text-foreground ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  )
}

const EVENT_LABELS: Record<LeadEvent['kind'], string> = {
  status: 'Статус',
  note: 'Заметка',
  assign: 'Ответственный',
  amount: 'Сумма сделки',
  reminder: 'Напоминание',
  reschedule: 'Замер перенесён',
  file: 'Документ',
}

function Timeline({ events, createdAt, status }: { events: LeadEvent[]; createdAt: string; status: string }) {
  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      <li className="relative">
        <span className="absolute -left-[26px] top-1 size-2.5 rounded-full bg-primary ring-4 ring-card" />
        <p className="text-sm font-medium">Заявка создана</p>
        <p className="text-xs text-muted-foreground">{formatDateTime(createdAt)}</p>
      </li>

      {events.map((event) => (
        <li key={event.id} className="relative">
          <span className="absolute -left-[26px] top-1 size-2.5 rounded-full bg-border ring-4 ring-card" />
          <p className="text-sm">
            <span className="font-medium">{EVENT_LABELS[event.kind] ?? event.kind}</span>
            {event.kind === 'status' && event.to_status && (
              <>
                {': '}
                <span className="text-muted-foreground">{statusText(event.from_status ?? '')} → </span>
                <span className="font-medium">{statusText(event.to_status)}</span>
              </>
            )}
            {event.kind !== 'status' && event.comment && <>: {event.comment}</>}
          </p>
          {event.kind === 'status' && event.comment && (
            <p className="mt-0.5 text-sm text-muted-foreground">{event.comment}</p>
          )}
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatDateTime(event.created_at)}
            {event.actor && ` · ${event.actor}`}
          </p>
        </li>
      ))}

      {events.length === 0 && (
        <li className="relative">
          <span className="absolute -left-[26px] top-1 size-2.5 rounded-full bg-border ring-4 ring-card" />
          {/* У заявок, созданных до появления истории, статус есть, а событий нет */}
          <p className="text-sm text-muted-foreground">
            {status === 'new'
              ? 'Пока ничего не происходило — заявку ещё не брали в работу.'
              : 'История пуста: статус меняли до того, как в панели появился журнал. Дальнейшие изменения будут записываться.'}
          </p>
        </li>
      )}
    </ol>
  )
}
