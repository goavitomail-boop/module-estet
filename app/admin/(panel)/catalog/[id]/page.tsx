import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import {
  catalogSectionLabel,
  getCatalogGroupNotes,
  getCatalogItem,
  listCatalogGroups,
} from '@/lib/db'
import { deleteCatalogAction } from '@/app/admin/catalog-actions'
import { CatalogEditor } from '../catalog-editor'
import { DeleteItemButton } from './delete-button'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Позиция каталога' }

export default async function EditCatalogItemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const item = await getCatalogItem(id)
  if (!item) notFound()

  const [groups, notes] = await Promise.all([
    listCatalogGroups(item.section).catch(() => []),
    getCatalogGroupNotes(item.section).catch(() => ({} as Record<string, string>)),
  ])

  return (
    <div className="space-y-5">
      <div>
        <Link
          href={`/admin/catalog?section=${item.section}`}
          className="-my-2 inline-flex min-h-11 items-center gap-1.5 py-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden />
          К каталогу
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{item.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{catalogSectionLabel(item.section)}</p>
      </div>

      <CatalogEditor
        item={item}
        section={item.section}
        groups={groups}
        groupNote={notes[item.group_title.trim().toLowerCase()] ?? ''}
      />

      <section className="rounded-xl border border-destructive/30 bg-card p-4 shadow-sm md:p-5">
        <h2 className="text-sm font-semibold">Удалить позицию</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Позиция исчезнет со страницы, а её фотография — из хранилища. Отменить это нельзя. Если нужно
          просто временно убрать её с сайта, снимите галочку «Показывать на сайте».
        </p>
        <form action={deleteCatalogAction} className="mt-3">
          <input type="hidden" name="id" value={item.id} />
          <DeleteItemButton name={item.name} />
        </form>
      </section>
    </div>
  )
}
