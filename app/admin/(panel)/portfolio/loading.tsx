import { PageHeaderSkeleton, PanelSkeleton } from '../../_components/ui'

export default function Loading() {
  return (
    <div className="admin-loading space-y-6" aria-busy="true" aria-label="Загрузка">
      <PageHeaderSkeleton actions />
      <PanelSkeleton rows={6} />
    </div>
  )
}
