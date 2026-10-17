import { PortfolioGrid } from '@/components/portfolio-grid'
import { PlanLabel } from '@/components/plan'
import { getPortfolioProjects } from '@/lib/portfolio-source'

export async function GallerySection() {
  const projects = await getPortfolioProjects()

  return (
    <section id="gallery" aria-labelledby="gallery-title" className="scroll-mt-24 bg-background py-14 text-foreground sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <header className="flex flex-col gap-5 pb-8 lg:flex-row lg:items-end lg:justify-between md:pb-10" data-anim>
          <div className="flex flex-col gap-2">
            <PlanLabel index={2} className="mb-2">Наши работы</PlanLabel>
            <h2 id="gallery-title" className="flyer-title text-balance text-4xl sm:text-5xl lg:text-6xl">Наши кухни.<br /><span className="text-muted-foreground">Ваше вдохновение.</span></h2>
          </div>
          <p className="max-w-sm text-pretty text-base leading-relaxed text-muted-foreground">Разные пространства, один подход — внимание к каждой детали. Найдите кухню, которая близка именно вам.</p>
        </header>
        <PortfolioGrid projects={projects} />
      </div>
    </section>
  )
}
