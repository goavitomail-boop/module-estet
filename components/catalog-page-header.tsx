import type { ReactNode } from 'react'
import { CropMarks, PlanLabel } from '@/components/plan'

/**
 * Тёмная шапка страниц каталога — тот же язык, что первый экран главной:
 * зерно, метки обреза, техническая метка, крупный плакатный заголовок
 * и нумерованные ссылки на разделы страницы.
 */
export function CatalogPageHeader({
  eyebrow,
  label,
  keyword,
  title,
  intro,
  action,
  sections = [],
  sectionsLabel,
}: {
  eyebrow: string
  /** Подпись над заголовком целиком, вместо «Каталог · {eyebrow}» — для разделов вне каталога */
  label?: string
  /**
   * Строка над крупным заголовком — то, что набирают в поиске («Фасады для кухни
   * на заказ»). Входит в H1 вместе с заголовком: тот образный, а поиску нужен смысл
   */
  keyword?: string
  title: string
  intro: string
  action?: ReactNode
  sections?: { id: string; title: string }[]
  sectionsLabel: string
}) {
  return (
    <header className="grain relative bg-foreground text-background">
      {/* Сверху отступ под фиксированную шапку сайта */}
      <CropMarks className="inset-x-4 bottom-4 top-24 md:inset-x-6 md:top-28" />
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-5 pb-14 pt-36 md:px-8 md:pb-20 md:pt-44">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between" data-anim="fade-up">
          <div className="max-w-3xl">
            <PlanLabel className="mb-5">{label ?? `Каталог · ${eyebrow}`}</PlanLabel>
            <h1 className="text-balance">
              {keyword && (
                <span className="mb-4 block text-sm font-semibold uppercase tracking-[0.16em] text-primary md:text-base">{keyword}</span>
              )}
              <span className="flyer-title block hyphens-auto text-[2.5rem] min-[360px]:text-5xl md:text-7xl">{title}</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-background/65">{intro}</p>
          </div>
          {action}
        </div>

        {sections.length > 1 && (
          <nav aria-label={sectionsLabel} className="flex gap-2 overflow-x-auto border-t border-background/15 pb-1 pt-6">
            {sections.map((section, index) => (
              <a key={section.id} href={`#${section.id}`} className="plan-chip plan-chip--on-dark">
                <span className="plan-num" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                {section.title}
              </a>
            ))}
          </nav>
        )}
      </div>
    </header>
  )
}
