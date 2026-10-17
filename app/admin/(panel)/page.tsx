import Link from 'next/link'
import { AlertTriangle, Clock } from 'lucide-react'
import {
  LEAD_STATUSES,
  getDashboardSummary,
  getDueReminders,
  getLeadsByDay,
  getOverdueLeads,
  isDbConfigured,
  type Lead,
} from '@/lib/db'
import { STATUS_TEXT, formatDateTime, formatHours, formatMoney, prettyPhone, timeAgo } from '@/lib/admin-format'
import { BarList, DayChart, EmptyState, Panel, STATUS_UI, StatTile, TypeBadge } from '../_components/ui'

export const dynamic = 'force-dynamic'

/** Порог реакции на новую заявку. Дольше — считаем просроченной. */
const SLA_HOURS = 2

export default async function DashboardPage() {
  if (!isDbConfigured()) {
    return <EmptyState title="Нет подключения к базе" hint="Сводка появится, как только будет задан DATABASE_URL." />
  }

  const [summary, byDay, overdue, reminders] = await Promise.all([
    getDashboardSummary(SLA_HOURS),
    getLeadsByDay(30),
    getOverdueLeads(SLA_HOURS, 8),
    getDueReminders(8),
  ])

  const trend = summary.yesterday > 0 ? Math.round(((summary.today - summary.yesterday) / summary.yesterday) * 100) : null

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Дашборд</h1>
        <p className="mt-1 text-sm text-muted-foreground">Что происходит с заявками прямо сейчас</p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Сегодня"
          value={summary.today}
          hint={
            trend === null
              ? `Вчера: ${summary.yesterday}`
              : `${trend >= 0 ? '↑' : '↓'} ${Math.abs(trend)}% ко вчера (${summary.yesterday})`
          }
        />
        <StatTile
          label="Требуют реакции"
          value={summary.byStatus.new ?? 0}
          tone={summary.overdue > 0 ? 'danger' : 'accent'}
          hint={summary.overdue > 0 ? `${summary.overdue} просрочено (>${SLA_HOURS} ч)` : 'Все свежие'}
          href="/admin/leads?status=new"
        />
        <StatTile
          label="Скорость ответа"
          value={formatHours(summary.avgResponseHours)}
          hint="Среднее за 30 дней"
        />
        <StatTile
          label="Конверсия за месяц"
          value={`${summary.conversionMonth}%`}
          tone="success"
          hint={`Выручка: ${formatMoney(summary.revenueMonth)}`}
        />
      </div>

      {/* Просроченные — самый важный рабочий список, поэтому вверху и с рамкой */}
      {overdue.length > 0 && (
        <Panel
          title={
            <span className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-4" aria-hidden />
              Просроченные заявки — {overdue.length}
            </span>
          }
          action={
            <Link href="/admin/leads?status=new" className="text-xs text-muted-foreground hover:text-foreground">
              Все новые →
            </Link>
          }
          className="border-destructive/40"
        >
          <LeadMiniList leads={overdue} />
        </Panel>
      )}

      {reminders.length > 0 && (
        <Panel
          title={
            <span className="flex items-center gap-2">
              <Clock className="size-4" aria-hidden />
              Напоминания на сегодня
            </span>
          }
        >
          <LeadMiniList leads={reminders} showReminder />
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Заявки за 30 дней" className="lg:col-span-2">
          <DayChart data={byDay} />
          <div className="mt-3 flex justify-between text-xs text-muted-foreground">
            <span>
              {new Date(byDay[0]?.day ?? Date.now()).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
            </span>
            <span>
              Всего за период: <strong className="text-foreground">{byDay.reduce((s, d) => s + d.total, 0)}</strong>
            </span>
            <span>сегодня</span>
          </div>
        </Panel>

        <Panel title="По статусам">
          <BarList
            items={LEAD_STATUSES.map((status) => ({
              label: STATUS_TEXT[status],
              value: summary.byStatus[status] ?? 0,
              icon: STATUS_UI[status].icon,
              color: STATUS_UI[status].dot,
            }))}
          />
          <div className="mt-5 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">За неделю</span>
              <span className="font-medium tabular-nums">{summary.week}</span>
            </div>
            <div className="mt-1.5 flex justify-between">
              <span className="text-muted-foreground">За месяц</span>
              <span className="font-medium tabular-nums">{summary.month}</span>
            </div>
            <div className="mt-1.5 flex justify-between">
              <span className="text-muted-foreground">Всего</span>
              <span className="font-medium tabular-nums">{summary.total}</span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}

function LeadMiniList({ leads, showReminder = false }: { leads: Lead[]; showReminder?: boolean }) {
  return (
    <ul className="divide-y divide-border">
      {leads.map((lead) => (
        <li key={lead.id}>
          <Link
            href={`/admin/leads/${lead.id}`}
            className="-mx-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg px-2 py-2.5 transition hover:bg-secondary"
          >
            <span className="font-mono text-xs text-muted-foreground">{lead.id}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{lead.name}</span>
            <span className="text-sm tabular-nums text-muted-foreground">{prettyPhone(lead.phone)}</span>
            <TypeBadge type={lead.type} />
            <span className="w-32 shrink-0 text-right text-xs text-muted-foreground">
              {showReminder ? formatDateTime(lead.next_contact_at) : timeAgo(lead.created_at)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
