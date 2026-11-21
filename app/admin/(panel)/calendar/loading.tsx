import { PageHeaderSkeleton, Skeleton } from '../../_components/ui'

/** Силуэт недели: на телефоне — дни списком, на десктопе — сетка 7 × 3 */
export default function Loading() {
  return (
    <div className="admin-loading space-y-6" aria-busy="true" aria-label="Загрузка календаря">
      <PageHeaderSkeleton actions />
      <div className="space-y-3 lg:hidden">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="hidden grid-cols-[110px_repeat(7,minmax(0,1fr))] gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid">
        {Array.from({ length: 32 }, (_, i) => (
          <div key={i} className="bg-card p-3" style={{ minHeight: i < 8 ? 52 : 96 }}>
            {i >= 8 && i % 3 === 0 && <Skeleton className="h-16 rounded-lg" />}
          </div>
        ))}
      </div>
    </div>
  )
}
