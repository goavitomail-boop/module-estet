import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import { ArrowLeft, Camera, ClipboardList, FileText, Images, MessageCircle, Trash2 } from 'lucide-react'
import { getClient, getOrder, listFeed, listOrderFiles, listVisits } from '@/lib/cabinet-db'
import { fileKind, PROJECT_STATUS, isProjectStatus, productLabel } from '@/lib/cabinet-shared'
import { timeAgo } from '@/lib/admin-format'
import { PageHeader, Panel } from '../../../_components/ui'
import { ConfirmSubmit } from '../../../_components/confirm-submit'
import { deleteOrderAction } from '@/app/admin/cabinet-actions'
import { cn } from '@/lib/utils'
import {
  MessageForm,
  OrderDetailsForm,
  OrderFilesEditor,
  ProjectControl,
  SpecEditor,
  StageControl,
  VisitsEditor,
} from './order-editor'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = await getOrder(id).catch(() => null)
  return { title: order ? `Заказ: ${order.title}` : 'Заказ' }
}

const ACTOR = { manager: 'Менеджер', client: 'Клиент', system: 'Система' } as const

export default async function OrderEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = await getOrder(id)
  if (!order) notFound()
  const [client, visits, files, feed] = await Promise.all([getClient(order.client_id), listVisits(order.id), listOrderFiles(order.id), listFeed(order.id, 60)])
  if (!client) notFound()

  const maxLinked = Boolean(client.max_user_id)
  const renders = files.filter((f) => fileKind(f.kind).group === 'project')
  const photos = files.filter((f) => fileKind(f.kind).group === 'photo')
  const docs = files.filter((f) => fileKind(f.kind).group === 'docs')
  const project = isProjectStatus(order.project_status) ? order.project_status : 'none'
  const lastChanges = feed.find((item) => item.kind === 'changes')

  return (
    <div className="space-y-6">
      <Link
        href={`/admin/kabinety/${client.id}`}
        className="-my-2 inline-flex min-h-11 items-center gap-1.5 py-2 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Кабинет: {client.name}
      </Link>

      <PageHeader
        eyebrow={`${productLabel(order.product)} · заказ в кабинете`}
        title={order.title}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {order.lead_id && (
              <Link href={`/admin/leads/${order.lead_id}`} className="font-mono text-xs hover:text-foreground">
                заявка {order.lead_id}
              </Link>
            )}
            <span className={cn('inline-flex items-center gap-1 text-xs', maxLinked ? 'text-emerald-700 dark:text-emerald-400' : '')}>
              <MessageCircle className="size-3.5" aria-hidden />
              {maxLinked ? 'Клиент получает новости в MAX' : 'MAX не привязан — клиент увидит новости в кабинете'}
            </span>
          </span>
        }
      />

      <Panel title="Этап заказа">
        <StageControl orderId={order.id} stage={order.stage} maxLinked={maxLinked} />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Panel
            title={
              <span className="flex items-center gap-2">
                <Images className="size-4 text-muted-foreground" aria-hidden />
                Проект
              </span>
            }
            action={<span className="text-xs text-muted-foreground">{PROJECT_STATUS[project]}</span>}
          >
            <ProjectControl
              orderId={order.id}
              status={project}
              maxLinked={maxLinked}
              lastChanges={lastChanges ? { text: lastChanges.text, at: lastChanges.created_at } : null}
            />
            <div className="mt-5 border-t border-border pt-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Визуализации</h3>
              <OrderFilesEditor orderId={order.id} files={renders} mode="project" maxLinked={maxLinked} />
            </div>
            <div className="mt-5 border-t border-border pt-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Спецификация</h3>
              <SpecEditor orderId={order.id} spec={order.spec} />
            </div>
          </Panel>

          <Panel
            title={
              <span className="flex items-center gap-2">
                <FileText className="size-4 text-muted-foreground" aria-hidden />
                Документы
              </span>
            }
          >
            <OrderFilesEditor orderId={order.id} files={docs} mode="docs" maxLinked={maxLinked} />
          </Panel>

          <Panel
            title={
              <span className="flex items-center gap-2">
                <Camera className="size-4 text-muted-foreground" aria-hidden />
                Фотоотчёт
              </span>
            }
          >
            <OrderFilesEditor orderId={order.id} files={photos} mode="photo" maxLinked={maxLinked} />
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel title="Визиты">
            <VisitsEditor orderId={order.id} visits={visits} maxLinked={maxLinked} />
          </Panel>

          <Panel
            title={
              <span className="flex items-center gap-2">
                <ClipboardList className="size-4 text-muted-foreground" aria-hidden />
                Лента заказа
              </span>
            }
          >
            <MessageForm orderId={order.id} maxLinked={maxLinked} />
            {feed.length > 0 && (
              <ol className="admin-timeline mt-5 space-y-3.5 pl-5">
                {feed.map((item, index) => (
                  <li key={item.id} className="relative" style={{ '--i': index } as CSSProperties}>
                    <span
                      className={cn(
                        'absolute -left-[25px] top-1.5 size-2.5 rounded-full ring-4 ring-card',
                        item.actor === 'client' ? 'bg-sky-500' : item.kind === 'stage' ? 'bg-primary' : 'bg-border'
                      )}
                    />
                    <p className="text-sm leading-relaxed">
                      <span className={cn('font-medium', item.actor === 'client' && 'text-sky-700 dark:text-sky-300')}>{ACTOR[item.actor]}: </span>
                      {item.text}
                    </p>
                    <p className="text-xs text-muted-foreground">{timeAgo(item.created_at)}</p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel title="Данные заказа">
            <OrderDetailsForm order={order} />
          </Panel>

          <form action={deleteOrderAction}>
            <input type="hidden" name="id" value={order.id} />
            <ConfirmSubmit
              title={`Удалить заказ «${order.title}»?`}
              description="Пропадут визиты, файлы, фото и лента заказа. Клиент перестанет видеть его в кабинете."
              confirmLabel="Удалить заказ"
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-destructive/40 text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-4" aria-hidden />
              Удалить заказ
            </ConfirmSubmit>
          </form>
        </aside>
      </div>
    </div>
  )
}
