import Image from 'next/image'
import type { CatalogItem } from '@/lib/pdf-catalog-data'
import { cn } from '@/lib/utils'

/**
 * Карточка системы хранения — на /filling и /wardrobes. Двигается снимок,
 * рамка стоит: при появлении он выдвигается из глубины, как ящик
 * (data-anim="drawers" на сетке, components/site-animations.tsx), при
 * наведении подаётся вперёд, а по низу рамки пробегает латунная кромка.
 * Подача — по кривой --out, возврат вдвое быстрее и с разгоном (--leave).
 */
const motion =
  'transition-transform duration-300 ease-[cubic-bezier(0.55,0,0.75,0)] group-hover:duration-700 group-hover:ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none'

export function StorageCard({ item, tall = false, sizes }: { item: CatalogItem; tall?: boolean; sizes: string }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/60">
      {/* Кухонные системы сняты в шкафу целиком — кадр вертикальный, 4:5 */}
      <div className={cn('relative overflow-hidden bg-muted', tall ? 'aspect-[4/5]' : 'aspect-[4/3]')}>
        <Image src={item.image} alt={item.name} fill sizes={sizes} data-anim-photo className={cn('object-cover group-hover:scale-[1.045]', motion)} />
        <span aria-hidden="true" className={cn('absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-primary group-hover:scale-x-100', motion)} />
      </div>
      <div className="flex flex-col gap-1 p-4">
        <h3 className="font-sans text-base font-semibold text-foreground">{item.name}</h3>
        {item.meta && <p className="text-sm leading-relaxed text-muted-foreground">{item.meta}</p>}
      </div>
    </article>
  )
}
