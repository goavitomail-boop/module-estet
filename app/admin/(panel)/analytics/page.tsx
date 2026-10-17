import {
  LEAD_STATUSES,
  getDashboardSummary,
  getHourlyDistribution,
  getLeadsByDay,
  getManagerStats,
  getQuizAnswerStats,
  getQuizFunnel,
  getRejectReasonStats,
  getSourceStats,
  isDbConfigured,
} from '@/lib/db'
import { QUIZ_STEP_NAMES, STATUS_TEXT, formatHours, formatMoney, plural } from '@/lib/admin-format'
import { BarList, DayChart, EmptyState, Panel, STATUS_UI, StatTile } from '../../_components/ui'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Аналитика' }

export default async function AnalyticsPage() {
  if (!isDbConfigured()) {
    return <EmptyState title="Нет подключения к базе" hint="Аналитика появится после настройки DATABASE_URL." />
  }

  const [summary, byDay, sources, managers, rejects, hourly, budgets, styles, layouts, timelines, funnel] =
    await Promise.all([
      getDashboardSummary(),
      getLeadsByDay(60),
      getSourceStats(30),
      getManagerStats(30),
      getRejectReasonStats(90),
      getHourlyDistribution(90),
      getQuizAnswerStats('budget'),
      getQuizAnswerStats('style'),
      getQuizAnswerStats('layout'),
      getQuizAnswerStats('timeline'),
      getQuizFunnel(30),
    ])

  // Воронка: сколько заявок дошло до каждой стадии
  const statusFunnel = LEAD_STATUSES.filter((s) => s !== 'rejected').map((status) => ({
    label: STATUS_TEXT[status],
    value: summary.byStatus[status] ?? 0,
    icon: STATUS_UI[status].icon,
    color: STATUS_UI[status].dot,
  }))

  const peakHour = hourly.reduce((best, h) => (h.total > best.total ? h : best), { hour: 0, total: 0 })

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Аналитика</h1>
        <p className="mt-1 text-sm text-muted-foreground">Откуда приходят заявки, что заказывают и почему уходят</p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Всего заявок" value={summary.total} hint={`За месяц: ${summary.month}`} />
        <StatTile label="Конверсия в закрытые" value={`${summary.conversionMonth}%`} tone="success" hint="За 30 дней" />
        <StatTile label="Выручка за месяц" value={formatMoney(summary.revenueMonth)} tone="accent" />
        <StatTile
          label="Пик обращений"
          value={`${String(peakHour.hour).padStart(2, '0')}:00`}
          hint={`${peakHour.total} ${plural(peakHour.total, 'заявка', 'заявки', 'заявок')} за 90 дней`}
        />
      </div>

      <Panel title="Динамика за 60 дней">
        <DayChart data={byDay} />
      </Panel>

      <Panel
        title="Воронка квиза за 30 дней"
        action={
          <span className="text-xs text-muted-foreground">
            начали {funnel.started} · дошли {funnel.completed}
            {funnel.started > 0 && ` · ${Math.round((funnel.completed / funnel.started) * 100)}%`}
          </span>
        }
      >
        <QuizFunnel data={funnel} />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Воронка по статусам">
          <BarList items={statusFunnel} />
          <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
            Средняя скорость первого ответа: <strong className="text-foreground">{formatHours(summary.avgResponseHours)}</strong>
          </p>
        </Panel>

        <Panel title="Источники за 30 дней">
          <BarList
            items={sources.map((s) => ({
              label: s.source,
              value: s.total,
              extra: s.done > 0 ? `${Math.round((s.done / s.total) * 100)}% закрыто` : undefined,
            }))}
            emptyText="Пока нет данных об источниках"
          />
          <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
            UTM-метки берутся из ссылки, по которой пришёл клиент. Добавляйте{' '}
            <code className="rounded bg-secondary px-1 py-0.5">?utm_source=…</code> в рекламные объявления, чтобы видеть
            разбивку по кампаниям.
          </p>
        </Panel>
      </div>

      {/* Ответы квиза — прямая подсказка, что чаще всего заказывают */}
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        <Panel title="Бюджеты">
          <BarList items={budgets.map((b) => ({ label: b.value, value: b.total }))} />
        </Panel>
        <Panel title="Стили">
          <BarList items={styles.map((s) => ({ label: s.value, value: s.total }))} />
        </Panel>
        <Panel title="Планировки">
          <BarList items={layouts.map((l) => ({ label: l.value, value: l.total }))} />
        </Panel>
        <Panel title="Сроки">
          <BarList items={timelines.map((t) => ({ label: t.value, value: t.total }))} />
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Причины отказов за 90 дней">
          <BarList items={rejects.map((r) => ({ label: r.reason, value: r.total }))} emptyText="Отказов пока не было" />
        </Panel>

        <Panel title="Обращения по часам (мск)">
          <HourChart data={hourly} />
          <p className="mt-3 text-xs text-muted-foreground">
            Подсказывает, в какие часы менеджер должен быть на линии.
          </p>
        </Panel>
      </div>

      <Panel title="Менеджеры за 30 дней">
        {managers.length === 0 ? (
          <EmptyState title="Пока никто не брал заявки в работу" />
        ) : (
          <>
            {/* Телефон: по карточке на менеджера вместо таблицы на 640px */}
            <ul className="space-y-3 md:hidden">
              {managers.map((m) => (
                <li key={m.manager} className="rounded-lg border border-border p-4">
                  <p className="font-medium">{m.manager}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                    <Metric label="Обработал" value={m.handled} />
                    <Metric label="Закрыл" value={m.done} tone="text-emerald-700" />
                    <Metric label="Отказов" value={m.rejected} tone="text-muted-foreground" />
                    <Metric label="Скорость ответа" value={formatHours(m.avg_hours)} />
                    <Metric label="Выручка" value={formatMoney(m.revenue)} />
                  </dl>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="pb-2.5 font-medium">Менеджер</th>
                  <th className="pb-2.5 text-right font-medium">Обработал</th>
                  <th className="pb-2.5 text-right font-medium">Закрыл</th>
                  <th className="pb-2.5 text-right font-medium">Отказов</th>
                  <th className="pb-2.5 text-right font-medium">Скорость ответа</th>
                  <th className="pb-2.5 text-right font-medium">Выручка</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {managers.map((m) => (
                  <tr key={m.manager}>
                    <td className="py-2.5 font-medium">{m.manager}</td>
                    <td className="py-2.5 text-right tabular-nums">{m.handled}</td>
                    <td className="py-2.5 text-right tabular-nums text-emerald-700">{m.done}</td>
                    <td className="py-2.5 text-right tabular-nums text-muted-foreground">{m.rejected}</td>
                    <td className="py-2.5 text-right tabular-nums">{formatHours(m.avg_hours)}</td>
                    <td className="py-2.5 text-right tabular-nums">{formatMoney(m.revenue)}</td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>
    </div>
  )
}

/**
 * Воронка квиза. Показывает не только сколько дошло до шага, но и сколько
 * остановилось именно на нём — самый большой «отвал» и есть место,
 * которое нужно чинить в форме.
 */
function QuizFunnel({ data }: { data: Awaited<ReturnType<typeof getQuizFunnel>> }) {
  if (data.started === 0) {
    return (
      <EmptyState
        title="Пока нет данных о прохождении квиза"
        hint="Учёт начал работать с этого момента: откройте страницу квиза на сайте — и первые шаги появятся здесь."
      />
    )
  }

  const worst = data.steps.reduce((a, b) => (b.droppedHere > a.droppedHere ? b : a), data.steps[0])

  return (
    <div className="space-y-2.5">
      {data.steps.map((s) => {
        const share = Math.round((s.reached / data.started) * 100)
        const isWorst = s.droppedHere > 0 && s.step === worst.step
        return (
          <div key={s.step}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span className="w-5 shrink-0 text-xs tabular-nums text-muted-foreground">{s.step}</span>
                <span className="truncate">{QUIZ_STEP_NAMES[s.step - 1]}</span>
                {isWorst && (
                  <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                    больше всего уходят
                  </span>
                )}
              </span>
              <span className="shrink-0 tabular-nums">
                {s.droppedHere > 0 && (
                  <span className="mr-2 text-xs text-destructive">−{s.droppedHere}</span>
                )}
                <span className="font-medium">{s.reached}</span>
                <span className="ml-1.5 text-xs text-muted-foreground">{share}%</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className={cn('h-full rounded-full', isWorst ? 'bg-destructive/60' : 'bg-primary')}
                style={{ width: `${Math.max(share, 2)}%` }}
              />
            </div>
          </div>
        )
      })}
      <p className="pt-2 text-xs text-muted-foreground">
        Красным отмечен шаг, на котором остановилось больше всего людей. Учитываются только начатые квизы за 30 дней,
        персональные данные не собираются.
      </p>
    </div>
  )
}

function Metric({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`mt-0.5 font-medium tabular-nums ${tone ?? ''}`}>{value}</dd>
    </div>
  )
}

function HourChart({ data }: { data: Array<{ hour: number; total: number }> }) {
  const max = Math.max(...data.map((d) => d.total), 1)
  return (
    <div>
      {/* h-full у колонки обязателен: иначе процентная высота столбика не резолвится */}
      <div className="flex h-32 gap-[2px]">
        {data.map((point) => (
          <div
            key={point.hour}
            className="group flex h-full flex-1 flex-col justify-end"
            title={`${String(point.hour).padStart(2, '0')}:00 — ${point.total}`}
          >
            <div
              className="w-full rounded-t bg-primary/70 transition group-hover:bg-primary"
              style={{ height: `${Math.max((point.total / max) * 100, 2)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] tabular-nums text-muted-foreground">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>23</span>
      </div>
    </div>
  )
}
