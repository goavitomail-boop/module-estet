import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { PortfolioImage } from '@/components/portfolio-image'
import type { PortfolioProject } from '@/lib/portfolio-data'

/** Сетка карточек проектов со ссылками на их страницы — /portfolio и страницы типов кухонь */
export function PortfolioCards({ projects, priorityCount = 3 }: { projects: PortfolioProject[]; priorityCount?: number }) {
  return (
    <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project, index) => (
        <li key={project.id}>
          <Link href={`/portfolio/${project.id}`} className="group flex flex-col gap-4">
            <span className="relative block aspect-[4/3] overflow-hidden rounded-3xl bg-muted">
              <PortfolioImage
                src={project.coverSrc}
                alt={project.alt}
                fill
                sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 400px"
                priority={index < priorityCount}
                className="motion-safe:transition-transform motion-safe:duration-700 group-hover:scale-[1.03]"
              />
            </span>
            <span className="flex items-start justify-between gap-3">
              <span className="flex flex-col gap-1">
                <span className="flyer-title text-2xl leading-tight">{project.title}</span>
                <span className="text-sm text-muted-foreground">{[project.style, project.area].filter(Boolean).join(' · ')}</span>
              </span>
              <ArrowUpRight className="mt-1 size-5 shrink-0 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
