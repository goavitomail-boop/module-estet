import Link from 'next/link'
import { ArrowRight, BellRing, Clock, Inbox, Timer, TrendingUp } from 'lucide-react'
import {
  LEAD_STATUSES,
  getDashboardSummary,
  getDueReminders,
  getLeadsByDay,
  getOverdueLeads,
  isDbConfigured,
  listKnownManagers,
  type Lead,
} from '@/lib/db'
import { STATUS_TEXT, formatDateTime, formatHours, formatMoney, prettyPhone, timeAgo } from '@/lib/admin-format'
import { BarList, ButtonLink, EmptyState, PageHeader, Panel, STATUS_UI, StatTile, TypeBadge } from '../_components/ui'
import { CountUp } from '../_components/count-up'
import { DayChart } from '../_components/day-chart'
import { QuickEditButton, QuickEditDrawer } from '../_components/quick-edit'
import { toQuickLead } from '@/lib/quick-lead'

export const dynamic = 'force-dynamic'

/** Порог реакции на новую заявку. Дольше — считаем просроченной. */
const SLA_HOURS = 2

export default async function DashboardPage() {
  if (!isDbConfigured()) {
    return <EmptyState title="Нет подключения к базе" hint="Сводка появится, как только будет задан DATABASE_URL." />
  }

  const [summary, byDay, overdue, reminders, managers] = await Promise.all([
    getDashboardSummary(SLA_HOURS),
    getLeadsByDay(30),
    getOverdueLeads(SLA_HOURS, 8),
    getDueReminders(8),
    listKnownManagers().catch(() => [] as string[]),
  ])

  const trend = summary.yesterday > 0 ? Math.round(((summary.today - summary.yesterday) / summary.yesterday) * 100) : null
  const today = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Moscow',
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={today}
        title="Дашборд"
        description="Что происходит с заявками прямо сейчас"
        actions={
          <ButtonLink href="/admin/leads">
            Все заявки
            <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        }
      />

      <div className="admin-tiles grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile
          index={0}
          label="Сегодня"
          icon={Inbox}
          value={<CountUp value={summary.today} />}
          hint={
            trend === null
              ? `Вчера: ${summary.yesterday}`
              : `${trend >= 0 ? '↑' : '↓'} ${Math.abs(trend)}% ко вчера (${summary.yesterday})`
          }
          spark={byDay.slice(-14).map((d) => d.total)}
        />
        <StatTile
          index={1}
          label="Требуют реакции"
          icon={BellRing}
          value={<CountUp value={summary.byStatus.new ?? 0} />}
          tone={summary.overdue > 0 ? 'danger' : 'accent'}
          hint={summary.overdue > 0 ? `${summary.overdue} просрочено (>${SLA_HOURS} ч)` : 'Все свежие'}
          href="/admin/leads?status=new"
        />
        <StatTile
          index={2}
          label="Скорость ответа"
          icon={Timer}
          value={formatHours(summary.avgResponseHours)}
          hint="Среднее за 30 дней"
        />
        <StatTile
          index={3}
          label="Конверсия за месяц"
          icon={TrendingUp}
          value={<CountUp value={summary.conversionMonth} format="percent" />}
          tone="success"
          hint={`Выручка: ${formatMoney(summary.revenueMonth)}`}
        />
      </div>

      {/* Просроченные — самый важный рабочий список, поэтому вверху и с рамкой */}
      {overdue.length > 0 && (
        <Panel
          title={
            <span className="flex items-center gap-2.5 text-destructive">
              <span className="admin-pulse" aria-hidden />
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
              <Clock className="size-4 text-accent-foreground" aria-hidden />
              Напоминания на сегодня
            </span>
          }
        >
          <LeadMiniList leads={reminders} showReminder />
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel
          title="Заявки за 30 дней"
          action={
            <span className="text-xs text-muted-foreground">
              всего <strong className="font-semibold tabular-nums text-foreground">{byDay.reduce((s, d) => s + d.total, 0)}</strong>
            </span>
          }
          className="lg:col-span-2"
        >
          <DayChart data={byDay} />
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
          <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
            <Total label="Неделя" value={summary.week} />
            <Total label="Месяц" value={summary.month} />
            <Total label="Всего" value={summary.total} />
          </dl>
        </Panel>
      </div>

      <QuickEditDrawer managers={managers} />
    </div>
  )
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-secondary/60 px-2 py-2.5">
      <dt className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{label}</dt>
      <dd className="admin-num mt-1 text-xl leading-none">
        <CountUp value={value} />
      </dd>
    </div>
  )
}

function LeadMiniList({ leads, showReminder = false }: { leads: Lead[]; showReminder?: boolean }) {
  return (
    <ul className="-my-1 divide-y divide-border">
      {leads.map((lead) => (
        <li key={lead.id} className="-mx-2 flex items-center gap-1">
          <Link
            href={`/admin/leads/${lead.id}`}
            className="group flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg px-2 py-2.5 transition-colors hover:bg-secondary/70"
          >
            <span className="font-mono text-xs text-muted-foreground">{lead.id}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{lead.name}</span>
            <span className="text-sm tabular-nums text-muted-foreground">{prettyPhone(lead.phone)}</span>
            <TypeBadge type={lead.type} />
            <span className="flex w-32 shrink-0 items-center justify-end gap-1.5 text-right text-xs text-muted-foreground">
              {showReminder ? formatDateTime(lead.next_contact_at) : timeAgo(lead.created_at)}
              <ArrowRight
                className="size-3.5 -translate-x-1 opacity-0 transition-[opacity,translate] duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                aria-hidden
              />
            </span>
          </Link>
          {/* Сменить статус или поставить напоминание, не уходя с дашборда */}
          <QuickEditButton lead={toQuickLead(lead)} />
        </li>
      ))}
    </ul>
  )
}
