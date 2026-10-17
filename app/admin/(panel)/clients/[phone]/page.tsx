import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Phone, Repeat2 } from 'lucide-react'
import { getClientByPhone, isDbConfigured } from '@/lib/db'
import {
  formatDateTime,
  formatMoney,
  leadSource,
  prettyPhone,
  telHref,
  timeAgo,
} from '@/lib/admin-format'
import { EmptyState, Panel, StatTile, StatusBadge, TypeBadge } from '../../../_components/ui'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ phone: string }> }) {
  const { phone } = await params
  return { title: `Клиент ${prettyPhone(phone)}` }
}

export default async function ClientPage({ params }: { params: Promise<{ phone: string }> }) {
  const { phone: rawPhone } = await params

  if (!isDbConfigured()) {
    return <EmptyState title="Нет подключения к базе" hint="Карточка клиента недоступна." />
  }

  const client = await getClientByPhone(decodeURIComponent(rawPhone))
  if (!client) notFound()

  const done = client.leads.filter((l) => l.status === 'done').length
  const rejected = client.leads.filter((l) => l.status === 'rejected').length

  return (
    <div className="space-y-6">
      <Link
        href="/admin/leads"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        К списку заявок
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight">{client.names[0] ?? 'Без имени'}</h1>
            {client.leads.length > 1 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-accent-foreground ring-1 ring-inset ring-primary/30">
                <Repeat2 className="size-3.5" aria-hidden />
                Повторное обращение
              </span>
            )}
          </div>
          {/* Один человек мог представиться по-разному — показываем все варианты */}
          {client.names.length > 1 && (
            <p className="mt-1 text-sm text-muted-foreground">Также представлялся: {client.names.slice(1).join(', ')}</p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            Первое обращение {formatDateTime(client.firstAt)} · последнее {timeAgo(client.lastAt)}
          </p>
        </div>

        <a
          href={telHref(client.phone)}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-foreground px-5 text-sm font-medium text-background transition hover:opacity-90 active:opacity-80 sm:w-auto"
        >
          <Phone className="size-4" aria-hidden />
          Позвонить {prettyPhone(client.phone)}
        </a>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Всего обращений" value={client.leads.length} />
        <StatTile label="Закрыто сделок" value={done} tone={done > 0 ? 'success' : 'default'} />
        <StatTile label="Отказов" value={rejected} />
        <StatTile
          label="Сумма сделок"
          value={formatMoney(client.totalAmount)}
          tone={client.totalAmount > 0 ? 'accent' : 'default'}
        />
      </div>

      <Panel title={`Все заявки — ${client.leads.length}`}>
        <ol className="relative space-y-4 border-l border-border pl-5">
          {client.leads.map((lead) => (
            <li key={lead.id} className="relative">
              <span className="absolute -left-[26px] top-2 size-2.5 rounded-full bg-border ring-4 ring-card" />
              <Link
                href={`/admin/leads/${lead.id}`}
                className="-mx-2 block rounded-lg px-2 py-2 transition hover:bg-secondary active:bg-secondary"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{lead.id}</span>
                  <TypeBadge type={lead.type} />
                  <StatusBadge status={lead.status} />
                  {lead.deal_amount && (
                    <span className="text-sm font-medium tabular-nums">{formatMoney(lead.deal_amount)}</span>
                  )}
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {formatDateTime(lead.created_at)} · {leadSource(lead)}
                  {lead.reject_reason && ` · причина отказа: ${lead.reject_reason}`}
                </p>
              </Link>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  )
}
