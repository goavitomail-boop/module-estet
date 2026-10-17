import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { catalogSectionLabel, isCatalogSection, listCatalogGroups, type CatalogSection } from '@/lib/db'
import { CatalogEditor } from '../catalog-editor'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Новая позиция' }

export default async function NewCatalogItemPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>
}) {
  const params = await searchParams
  const section: CatalogSection = isCatalogSection(params.section ?? '')
    ? (params.section as CatalogSection)
    : 'filling'

  const groups = await listCatalogGroups(section).catch(() => [])

  return (
    <div className="space-y-5">
      <div>
        <Link
          href={`/admin/catalog?section=${section}`}
          className="-my-2 inline-flex min-h-11 items-center gap-1.5 py-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden />
          К каталогу
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Новая позиция · {catalogSectionLabel(section)}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          После сохранения позиция встанет последней в разделе — порядок меняется стрелками в списке.
        </p>
      </div>

      <CatalogEditor item={null} section={section} groups={groups} />
    </div>
  )
}
