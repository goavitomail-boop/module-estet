import { PageHeaderSkeleton, PanelSkeleton, Skeleton } from '@/app/admin/_components/ui'

/** Силуэт кабинета, пока сервер собирает страницу — появляется с задержкой (admin.css) */
export default function Loading() {
  return (
    <div className="admin-loading space-y-6" aria-busy="true" aria-label="Загрузка">
      <PageHeaderSkeleton />
      <Skeleton className="h-56 rounded-xl" />
      <PanelSkeleton rows={3} />
    </div>
  )
}
