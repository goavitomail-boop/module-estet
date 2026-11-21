import { PanelSkeleton, Skeleton } from '../../../_components/ui'

/** Силуэт карточки заявки: шапка с кнопками, данные слева, действия справа */
export default function Loading() {
  return (
    <div className="admin-loading space-y-6" aria-busy="true" aria-label="Загрузка заявки">
      <Skeleton className="h-4 w-32" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2.5">
          <div className="flex gap-2.5">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
          <Skeleton className="h-3.5 w-56" />
        </div>
        <Skeleton className="h-12 w-full rounded-lg sm:h-11 sm:w-56" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <PanelSkeleton rows={3} />
          <PanelSkeleton rows={4} />
        </div>
        <div className="space-y-4">
          {[180, 140, 120].map((h, i) => (
            <Skeleton key={i} className="rounded-xl" style={{ height: h }} />
          ))}
        </div>
      </div>
    </div>
  )
}
