import Link from 'next/link'
import type { CSSProperties } from 'react'
import { ArrowRight, CalendarClock, MapPin, MessageCircle, PenTool, Sparkles } from 'lucide-react'
import { requireClient } from '@/lib/cabinet-auth'
import { listOrders, nextVisits } from '@/lib/cabinet-db'
import { formatDay, formatTime, productLabel, stageLabel, visitKindLabel } from '@/lib/cabinet-shared'
import { EmptyState, PageHeader } from '@/app/admin/_components/ui'
import { StageTrack } from '../_components/stage-track'

export const metadata = { title: 'Заказы' }

export default async function KabinetHome({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const client = await requireClient()
  const { welcome } = await searchParams
  const orders = await listOrders(client.id)
  const visits = await nextVisits(orders.map((order) => order.id))
  const firstName = client.name.split(' ')[0]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Личный кабинет"
        title={`Здравствуйте, ${firstName}`}
        description={
          orders.length > 1
            ? `Заказов: ${orders.length}. Нажмите на заказ, чтобы увидеть подробности.`
            : 'Здесь видно, на каком этапе заказ, когда приедут мастера, и все документы по нему.'
        }
      />

      {welcome && (
        <div className="admin-pop flex items-start gap-3 rounded-xl border border-primary/40 bg-primary/10 p-4">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-accent-foreground" aria-hidden />
          <p className="text-sm leading-relaxed">
            Кабинет готов. Входите по номеру телефона и паролю, который вы задали.
          </p>
        </div>
      )}

      {!client.max_user_id && (
        <Link
          href="/kabinet/profil#max"
          className="admin-lift group flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-accent-foreground">
            <MessageCircle className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Привяжите MAX</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
              Новости по заказу придут сообщением, а входить можно будет кодом — без пароля.
            </span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      )}

      {orders.length === 0 ? (
        <EmptyState
          icon={PenTool}
          title="Заказов пока нет"
          hint="Менеджер добавит заказ сюда, как только начнётся работа: после замера или первой встречи с дизайнером."
        />
      ) : (
        <ul className="admin-stagger grid gap-4 md:grid-cols-2">
          {orders.map((order, index) => {
            const visit = visits[order.id]
            return (
              <li key={order.id} style={{ '--i': index } as CSSProperties}>
                <Link
                  href={`/kabinet/zakaz/${order.id}`}
                  className="admin-lift group block h-full rounded-xl border border-border bg-card p-5 shadow-sm hover:border-primary/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent-foreground">
                        {productLabel(order.product)}
                      </p>
                      <h2 className="admin-display mt-1 truncate text-xl leading-tight">{order.title}</h2>
                      {order.address && (
                        <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                          <MapPin className="size-3.5 shrink-0" aria-hidden />
                          <span className="truncate">{order.address}</span>
                        </p>
                      )}
                    </div>
                    <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </div>

                  <div className="mt-5">
                    <StageTrack stage={order.stage} compact />
                  </div>
                  <p className="mt-3 text-sm font-medium">{stageLabel(order.stage)}</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {order.project_status === 'sent' && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-accent-foreground">
                        <span className="admin-pulse !bg-primary" aria-hidden />
                        Проект ждёт согласования
                      </span>
                    )}
                    {visit && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                        <CalendarClock className="size-3.5" aria-hidden />
                        {visitKindLabel(visit.kind)}: {formatDay(visit.starts_at)}, {formatTime(visit.starts_at)}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
