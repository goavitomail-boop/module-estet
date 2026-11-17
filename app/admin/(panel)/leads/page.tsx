import Link from 'next/link'
import { ChevronDown, Download, Phone, SlidersHorizontal } from 'lucide-react'
import {
  LEAD_STATUSES,
  isDbConfigured,
  listKnownManagers,
  listLeads,
  type LeadStatus,
  type LeadType,
} from '@/lib/db'
import { STATUS_TEXT, hoursSince, leadSource, prettyPhone, telHref, timeAgo } from '@/lib/admin-format'
import { EmptyState, OverdueBadge, PageHeader, STATUS_UI, StatusBadge, TypeBadge } from '../../_components/ui'
import { StatusTabs } from '../../_components/status-tabs'
import { QuickEditButton, QuickEditDrawer } from '../../_components/quick-edit'
import { toQuickLead } from '@/lib/quick-lead'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Заявки' }

const PAGE_SIZE = 25
const SLA_HOURS = 2

type SearchParams = Record<string, string | string[] | undefined>

function one(params: SearchParams, key: string): string {
  const value = params[key]
  return (Array.isArray(value) ? value[0] : value) ?? ''
}

/** Собирает ссылку, сохраняя текущие фильтры и меняя только нужные ключи */
function buildHref(params: SearchParams, patch: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    const v = Array.isArray(value) ? value[0] : value
    if (v) query.set(key, v)
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === '') query.delete(key)
    else query.set(key, String(value))
  }
  const qs = query.toString()
  return qs ? `/admin/leads?${qs}` : '/admin/leads'
}

export default async function LeadsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams

  if (!isDbConfigured()) {
    return <EmptyState title="Нет подключения к базе" hint="Список заявок появится после настройки DATABASE_URL." />
  }

  const status = (one(params, 'status') || 'all') as LeadStatus | 'all'
  const type = (one(params, 'type') || 'all') as LeadType | 'all'
  const search = one(params, 'q')
  const from = one(params, 'from')
  const to = one(params, 'to')
  const assignedTo = one(params, 'manager')
  const sort = one(params, 'sort') === 'old_first' ? 'old_first' : 'new_first'
  const page = Math.max(Number(one(params, 'page')) || 1, 1)

  const [{ rows, total }, managers] = await Promise.all([
    listLeads({
      status,
      type,
      search: search || undefined,
      from: from || undefined,
      to: to || undefined,
      assignedTo: assignedTo || undefined,
      sort,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    listKnownManagers(),
  ])

  // Счётчик на свёрнутом блоке: иначе с телефона не видно, что список отфильтрован
  const activeFilterCount = [search, from, to, assignedTo, type !== 'all' ? type : ''].filter(Boolean).length
  const hasFilters = activeFilterCount > 0

  const pages = Math.max(Math.ceil(total / PAGE_SIZE), 1)
  const exportHref = buildHref(params, { page: undefined }).replace('/admin/leads', '/admin/export')

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={status === 'all' ? 'Все обращения' : STATUS_TEXT[status]}
        title="Заявки"
        description={
          <>
            Найдено: <strong className="text-foreground tabular-nums">{total}</strong>
          </>
        }
        actions={
          <a
            href={exportHref}
            className="admin-press inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium shadow-sm transition hover:bg-secondary active:bg-secondary"
          >
            <Download className="size-4" aria-hidden />
            <span className="hidden sm:inline">Выгрузить</span> CSV
          </a>
        }
      />

      {/* Статусы вкладками — самый частый фильтр, должен быть в один клик.
          На телефоне лента прокручивается вбок: перенос на три строки съедал бы экран.
          Отрицательные отступы дают ленте уходить под края, чтобы было видно,
          что она продолжается. */}
      <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:overflow-visible lg:px-0">
        <StatusTabs
          tabs={[
            {
              key: 'all',
              href: buildHref(params, { status: undefined, page: undefined }),
              label: 'Все',
              active: status === 'all',
            },
            ...LEAD_STATUSES.map((value) => ({
              key: value,
              href: buildHref(params, { status: value, page: undefined }),
              label: STATUS_TEXT[value],
              active: status === value,
            })),
          ]}
        />
      </div>

      {/* details вместо состояния: сворачивание работает без JS и одинаково на всех
          экранах. Раскрыт, если фильтр уже применён, — иначе непонятно, почему
          список короткий. Самый частый фильтр (статус) вынесен во вкладки выше
          и виден всегда, поэтому свёрнутый блок никому не мешает. */}
      <details className="group rounded-xl border border-border bg-card shadow-sm" open={hasFilters}>
        <summary className="flex h-12 cursor-pointer list-none items-center justify-between px-5 text-sm font-medium">
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="size-4" aria-hidden />
            Фильтры
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </span>
          <ChevronDown className="size-4 transition-transform duration-300 group-open:rotate-180" aria-hidden />
        </summary>

        <form method="get" className="grid gap-3 border-t border-border p-5 sm:grid-cols-2 lg:grid-cols-6">
          <Field label="Поиск" className="lg:col-span-2">
            <input
              name="q"
              defaultValue={search}
              placeholder="Телефон, имя или номер"
              className="input-admin"
            />
          </Field>
          <Field label="Тип">
            <select name="type" defaultValue={type} className="input-admin">
              <option value="all">Любой</option>
              <option value="measurement">Замер</option>
              <option value="project">Проект</option>
            </select>
          </Field>
          <Field label="С даты">
            <input type="date" name="from" defaultValue={from} className="input-admin" />
          </Field>
          <Field label="По дату">
            <input type="date" name="to" defaultValue={to} className="input-admin" />
          </Field>
          <Field label="Менеджер">
            <select name="manager" defaultValue={assignedTo} className="input-admin">
              <option value="">Все</option>
              {managers.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>

          {status !== 'all' && <input type="hidden" name="status" value={status} />}
          <input type="hidden" name="sort" value={sort} />

          <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-6">
            <button
              type="submit"
              className="h-11 flex-1 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition hover:opacity-90 sm:flex-none"
            >
              Применить
            </button>
            <Link
              href="/admin/leads"
              className="flex h-11 flex-1 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium transition hover:bg-secondary sm:flex-none"
            >
              Сбросить
            </Link>
            <Link
              href={buildHref(params, { sort: sort === 'new_first' ? 'old_first' : 'new_first', page: undefined })}
              className="flex h-11 w-full items-center justify-center text-sm text-muted-foreground hover:text-foreground sm:ml-auto sm:w-auto"
            >
              {sort === 'new_first' ? 'Сначала новые ↓' : 'Сначала старые ↑'}
            </Link>
          </div>
        </form>
      </details>

      {rows.length === 0 ? (
        <EmptyState title="Заявок не найдено" hint="Попробуйте изменить фильтры или сбросить их." />
      ) : (
        <>
          {/* ── Телефон: карточки. Таблица на 900px здесь превращается в
                 горизонтальную прокрутку, в которой ничего не найти. ── */}
          <ul className="admin-stagger space-y-3 lg:hidden">
            {rows.map((lead, index) => {
              const overdue = lead.status === 'new' && hoursSince(lead.created_at) > SLA_HOURS
              return (
                <li
                  key={lead.id}
                  style={{ '--i': index } as React.CSSProperties}
                  className={cn(
                    'relative overflow-hidden rounded-xl border bg-card shadow-sm',
                    overdue ? 'border-destructive/40' : 'border-border'
                  )}
                >
                  {/* Цветная кромка слева — статус виден, даже когда бейдж не читаешь */}
                  <span className={cn('absolute inset-y-0 left-0 w-[3px]', STATUS_UI[lead.status]?.dot)} aria-hidden />
                  <Link href={`/admin/leads/${lead.id}`} className="block p-4 transition-colors active:bg-secondary/60">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold leading-tight">{lead.name}</p>
                        <p className="mt-0.5 font-mono text-xs text-muted-foreground">{lead.id}</p>
                      </div>
                      <StatusBadge status={lead.status} />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <TypeBadge type={lead.type} />
                      {overdue && <OverdueBadge />}
                      <span className="ml-auto text-xs text-muted-foreground">{timeAgo(lead.created_at)}</span>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{leadSource(lead)}</span>
                      {(lead.assigned_to || lead.status_by) && (
                        <span className="truncate">· {lead.assigned_to || lead.status_by}</span>
                      )}
                    </div>
                  </Link>

                  {/* Звонок вынесен из ссылки на карточку: вложенные ссылки недопустимы,
                      да и промахнуться по нему на ходу проще, чем по всей карточке */}
                  <div className="flex border-t border-border">
                    <a
                      href={telHref(lead.phone)}
                      className="flex h-12 flex-1 items-center justify-center gap-2 bg-secondary/40 text-sm font-medium tabular-nums transition active:bg-secondary"
                    >
                      <Phone className="size-4 opacity-60" aria-hidden />
                      {prettyPhone(lead.phone)}
                    </a>
                    {/* Статус, заметка, напоминание — не уходя из списка */}
                    <QuickEditButton lead={toQuickLead(lead)} variant="bar" />
                  </div>
                </li>
              )
            })}
          </ul>

          {/* ── Десктоп: полная таблица ── */}
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b border-border bg-secondary/60 text-left">
                <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Номер</th>
                  <th className="px-4 py-3 font-medium">Клиент</th>
                  <th className="px-4 py-3 font-medium">Телефон</th>
                  <th className="px-4 py-3 font-medium">Тип</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                  <th className="px-4 py-3 font-medium">Источник</th>
                  <th className="px-4 py-3 font-medium">Менеджер</th>
                  <th className="py-3 pl-4 pr-14 text-right font-medium">Создана</th>
                </tr>
              </thead>
              <tbody className="admin-stagger divide-y divide-border">
                {rows.map((lead, index) => {
                  const overdue = lead.status === 'new' && hoursSince(lead.created_at) > SLA_HOURS
                  return (
                    <tr
                      key={lead.id}
                      style={{ '--i': index } as React.CSSProperties}
                      className={cn('group transition-colors hover:bg-secondary/60', overdue && 'bg-destructive/[0.04]')}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/leads/${lead.id}`}
                          className="font-mono text-xs font-medium text-foreground underline-offset-2 hover:underline"
                        >
                          {lead.id}
                        </Link>
                        {overdue && (
                          <span className="ml-2">
                            <OverdueBadge compact />
                          </span>
                        )}
                      </td>
                      <td className="max-w-[180px] truncate px-4 py-3 font-medium">
                        <Link href={`/admin/leads/${lead.id}`} className="hover:underline">
                          {lead.name}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <a
                          href={telHref(lead.phone)}
                          className="inline-flex items-center gap-1.5 tabular-nums text-foreground hover:text-primary"
                        >
                          <Phone className="size-3.5 opacity-50" aria-hidden />
                          {prettyPhone(lead.phone)}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <TypeBadge type={lead.type} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={lead.status} />
                      </td>
                      <td className="max-w-[150px] truncate px-4 py-3 text-muted-foreground">{leadSource(lead)}</td>
                      <td className="max-w-[120px] truncate px-4 py-3 text-muted-foreground">
                        {lead.assigned_to || lead.status_by || '—'}
                      </td>
                      <td className="whitespace-nowrap py-1.5 pl-4 pr-2 text-right text-muted-foreground">
                        {/* Карандаш — быстрое редактирование, не уходя из списка */}
                        <span className="inline-flex items-center gap-1.5">
                          {timeAgo(lead.created_at)}
                          <QuickEditButton lead={toQuickLead(lead)} />
                        </span>
                      </td>
                    </tr>
                  )
                })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <QuickEditDrawer managers={managers} />

      {pages > 1 && (
        <nav className="flex items-center justify-center gap-2" aria-label="Страницы">
          <PageLink href={buildHref(params, { page: page - 1 })} disabled={page <= 1}>
            ← Назад
          </PageLink>
          <span className="px-3 text-sm tabular-nums text-muted-foreground">
            {page} из {pages}
          </span>
          <PageLink href={buildHref(params, { page: page + 1 })} disabled={page >= pages}>
            Вперёд →
          </PageLink>
        </nav>
      )}
    </div>
  )
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function PageLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  const base = 'flex h-11 min-w-[104px] items-center justify-center rounded-lg border border-border px-4 text-sm'
  if (disabled) {
    return <span className={cn(base, 'text-muted-foreground/50')}>{children}</span>
  }
  return (
    <Link href={href} className={cn(base, 'admin-press bg-card transition hover:bg-secondary active:bg-secondary')}>
      {children}
    </Link>
  )
}
