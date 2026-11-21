import { PageHeaderSkeleton, PanelSkeleton, Skeleton } from '../_components/ui'

/**
 * Пока сервер собирает страницу, на месте данных — их силуэт. Без него переход
 * между разделами выглядел как зависание: страницы панели всегда свежие
 * (force-dynamic) и ждут ответа базы. Появляется с задержкой (admin.css,
 * .admin-loading): если база ответила быстро, его не видно вовсе.
 */
export default function Loading() {
  return (
    <div className="admin-loading space-y-6" aria-busy="true" aria-label="Загрузка">
      <PageHeaderSkeleton actions />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-2.5 w-28" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <Skeleton className="mb-5 h-3.5 w-36" />
          <div className="flex h-44 items-end gap-[3px] sm:h-52">
            {Array.from({ length: 30 }, (_, i) => (
              <Skeleton key={i} className="flex-1 rounded-b-none" style={{ height: `${25 + ((i * 37) % 65)}%` }} />
            ))}
          </div>
        </div>
        <PanelSkeleton rows={5} />
      </div>
    </div>
  )
}
