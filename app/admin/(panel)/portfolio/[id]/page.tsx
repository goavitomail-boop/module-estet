import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { getPortfolioProject } from '@/lib/db'
import { deletePortfolioAction } from '@/app/admin/portfolio-actions'
import { PortfolioEditor } from '../portfolio-editor'
import { DeleteProjectButton } from './delete-button'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Проект' }

export default async function EditPortfolioProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const project = await getPortfolioProject(id)
  if (!project) notFound()

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
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{project.title}</h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">{project.id}</p>
      </div>

      <PortfolioEditor project={project} />

      <section className="rounded-xl border border-destructive/30 bg-card p-4 shadow-sm md:p-5">
        <h2 className="text-sm font-semibold">Удалить проект</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Проект исчезнет из галереи, а его фотографии — из хранилища. Отменить это нельзя. Если проект нужно
          просто временно убрать с сайта, снимите галочку «Показывать на сайте».
        </p>
        <form action={deletePortfolioAction} className="mt-3">
          <input type="hidden" name="id" value={project.id} />
          <DeleteProjectButton title={project.title} />
        </form>
      </section>
    </div>
  )
}
