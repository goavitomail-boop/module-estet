import Link from 'next/link'
import type { CSSProperties } from 'react'
import { CheckCircle2, KeyRound, MessageCircle, Plus, Search, UserRound } from 'lucide-react'
import { isDbConfigured } from '@/lib/db'
import { listClients } from '@/lib/cabinet-db'
import { isCabinetConfigured } from '@/lib/cabinet-auth'
import { prettyPhone, timeAgo } from '@/lib/admin-format'
import { EmptyState, PageHeader } from '../../_components/ui'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Кабинеты клиентов' }

export default async function CabinetsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams
  const header = (
    <PageHeader
      eyebrow="Клиенты"
      title="Личные кабинеты"
      description="Клиент видит этап заказа, визиты, проект, документы и фото. Кабинет открывает администратор."
      actions={
        <Link
          href="/admin/kabinety/novyi"
          className="admin-press inline-flex h-11 items-center gap-1.5 rounded-lg bg-foreground px-4 text-sm font-medium text-background shadow-sm hover:opacity-90 md:h-10"
        >
          <Plus className="size-4" aria-hidden />
          Новый кабинет
        </Link>
      }
    />
  )

  if (!isDbConfigured() || !isCabinetConfigured()) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState
          title="Кабинеты недоступны"
          hint="Нужны база данных (DATABASE_URL) и секрет сессий: ADMIN_SESSION_SECRET или отдельный CLIENT_SESSION_SECRET."
        />
      </div>
    )
  }

  const clients = await listClients(q)

  return (
    <div className="space-y-6">
      {header}

      <form method="get" className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          name="q"
          defaultValue={q}
          placeholder="Имя или телефон"
          className="input-admin !h-12 rounded-xl !pl-10 shadow-sm"
          aria-label="Поиск по кабинетам"
        />
      </form>

      {clients.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title={q ? 'Никого не нашли' : 'Кабинетов пока нет'}
          hint={
            q
              ? 'Попробуйте другой номер или имя.'
              : 'Откройте кабинет кнопкой «Новый кабинет» или прямо из карточки заявки — блок «Личный кабинет».'
          }
        />
      ) : (
        <ul className="admin-stagger grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {clients.map((client, index) => (
            <li key={client.id} style={{ '--i': index } as CSSProperties}>
              <Link
                href={`/admin/kabinety/${client.id}`}
                className={cn(
                  'admin-lift block h-full rounded-xl border bg-card p-4 shadow-sm hover:border-primary/50',
                  client.blocked ? 'border-destructive/30 opacity-70' : 'border-border'
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
                    {client.name
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((p) => p[0]?.toUpperCase())
                      .join('')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{client.name}</p>
                    <p className="text-sm tabular-nums text-muted-foreground">{prettyPhone(client.phone)}</p>
                  </div>
                  <span className="admin-num shrink-0 text-2xl leading-none" title="Заказов в работе">
                    {client.active_orders}
                    <span className="text-sm text-muted-foreground">/{client.orders}</span>
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                  {client.blocked && <Chip tone="danger">Заблокирован</Chip>}
                  {client.has_password ? (
                    <Chip tone="ok" icon={KeyRound}>
                      Пароль задан
                    </Chip>
                  ) : (
                    <Chip>Пароля нет</Chip>
                  )}
                  {client.max_user_id ? (
                    <Chip tone="ok" icon={MessageCircle}>
                      MAX
                    </Chip>
                  ) : (
                    <Chip>MAX не привязан</Chip>
                  )}
                  <Chip icon={CheckCircle2}>{client.last_login_at ? `Заходил ${timeAgo(client.last_login_at)}` : 'Ещё не заходил'}</Chip>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Chip({
  children,
  tone,
  icon: Icon,
}: {
  children: React.ReactNode
  tone?: 'ok' | 'danger'
  icon?: typeof KeyRound
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium',
        tone === 'ok' && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
        tone === 'danger' && 'bg-destructive/10 text-destructive',
        !tone && 'bg-secondary text-muted-foreground'
      )}
    >
      {Icon && <Icon className="size-3" aria-hidden />}
      {children}
    </span>
  )
}
