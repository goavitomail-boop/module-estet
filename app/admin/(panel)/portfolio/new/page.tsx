import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { PortfolioEditor } from '../portfolio-editor'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Новый проект' }

export default function NewPortfolioProjectPage() {
  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/admin/portfolio"
          className="-my-2 inline-flex min-h-11 items-center gap-1.5 py-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden />
          К портфолио
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Новый проект</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          После сохранения проект встанет последним в галерее — порядок меняется стрелками в списке.
        </p>
      </div>

      <PortfolioEditor project={null} />
    </div>
  )
}
