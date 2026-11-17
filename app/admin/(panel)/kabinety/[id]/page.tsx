import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import { ArrowLeft, ArrowRight, Inbox } from 'lucide-react'
import { listLeads } from '@/lib/db'
import { getClient, hasPendingInvite, listOrders, toPublicClient } from '@/lib/cabinet-db'
import { productLabel, stageLabel } from '@/lib/cabinet-shared'
import { formatDateTime, prettyPhone, timeAgo } from '@/lib/admin-format'
import { EmptyState, PageHeader, Panel, StatusBadge } from '../../../_components/ui'
import { StageTrack } from '@/app/kabinet/_components/stage-track'
import { AccessPanel, ClientInfoForm, NewOrderForm } from './client-forms'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const client = await getClient(id).catch(() => null)
  return { title: client ? `Кабинет: ${client.name}` : 'Кабинет' }
}

export default async function CabinetClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const client = await getClient(id)
  if (!client) notFound()

  const [orders, invite, leads] = await Promise.all([
    listOrders(client.id),
    hasPendingInvite(client.id),
    listLeads({ search: client.phone_digits, limit: 20 }).catch(() => ({ rows: [], total: 0 })),
  ])
  const linkedLeads = new Set(orders.map((o) => o.lead_id).filter(Boolean))
  const freeLeads = leads.rows.filter((lead) => !linkedLeads.has(lead.id))

  return (
    <div className="space-y-6">
      <Link
        href="/admin/kabinety"
        className="-my-2 inline-flex min-h-11 items-center gap-1.5 py-2 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Все кабинеты
      </Link>

      <PageHeader
        eyebrow="Личный кабинет"
        title={client.name}
        description={
          <>
            {prettyPhone(client.phone)} · открыт {formatDateTime(client.created_at)} ·{' '}
            {client.last_login_at ? `заходил ${timeAgo(client.last_login_at)}` : 'ещё не заходил'}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Panel title={`Заказы — ${orders.length}`}>
            {orders.length === 0 ? (
              <EmptyState title="Заказов нет" hint="Добавьте заказ ниже — клиент увидит его в кабинете." />
            ) : (
              <ul className="admin-stagger space-y-3">
                {orders.map((order, index) => (
                  <li key={order.id} style={{ '--i': index } as CSSProperties}>
                    <Link
                      href={`/admin/zakazy/${order.id}`}
                      className="admin-lift group block rounded-xl border border-border bg-background p-4 hover:border-primary/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-accent-foreground">
                            {productLabel(order.product)}
                            {order.lead_id && <span className="ml-2 font-mono normal-case tracking-normal text-muted-foreground">{order.lead_id}</span>}
                          </p>
                          <p className="mt-0.5 truncate font-semibold">{order.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {stageLabel(order.stage)} · обновлён {timeAgo(order.updated_at)}
                          </p>
                        </div>
                        <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                      </div>
                      <div className="mt-3">
                        <StageTrack stage={order.stage} compact />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-5 border-t border-border pt-4">
              <NewOrderForm clientId={client.id} />
            </div>
          </Panel>

          {freeLeads.length > 0 && (
            <Panel
              title={
                <span className="flex items-center gap-2">
                  <Inbox className="size-4 text-muted-foreground" aria-hidden />
                  Заявки с этого номера
                </span>
              }
            >
              <ul className="-my-1 divide-y divide-border">
                {freeLeads.map((lead) => (
                  <li key={lead.id} className="flex flex-wrap items-center gap-3 py-2.5">
                    <Link href={`/admin/leads/${lead.id}`} className="font-mono text-xs text-muted-foreground hover:text-foreground">
                      {lead.id}
                    </Link>
                    <StatusBadge status={lead.status} />
                    <span className="text-xs text-muted-foreground">{timeAgo(lead.created_at)}</span>
                    <NewOrderForm clientId={client.id} leadId={lead.id} compact />
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

        <aside className="space-y-6">
          <AccessPanel client={toPublicClient(client)} invitePending={invite} />
          <Panel title="Контакты">
            <ClientInfoForm id={client.id} name={client.name} phone={client.phone} />
          </Panel>
        </aside>
      </div>
    </div>
  )
}
