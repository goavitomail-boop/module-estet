import { PageHeaderSkeleton, Skeleton } from '../../_components/ui'

/** Силуэт списка заявок: вкладки статусов, фильтры, строки */
export default function Loading() {
  return (
    <div className="admin-loading space-y-6" aria-busy="true" aria-label="Загрузка заявок">
      <PageHeaderSkeleton actions />
      <div className="flex gap-2 overflow-hidden">
        {[56, 88, 96, 120, 80, 72].map((w, i) => (
          <Skeleton key={i} className="h-11 shrink-0 rounded-full md:h-9" style={{ width: w }} />
        ))}
      </div>
      <Skeleton className="h-12 rounded-xl" />
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-4 last:border-0">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3.5 flex-1 lg:max-w-48" />
            <Skeleton className="hidden h-3 w-28 lg:block" />
            <Skeleton className="hidden h-6 w-20 rounded-full lg:block" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="hidden h-3 w-20 lg:block" />
          </div>
        ))}
      </div>
    </div>
  )
}
