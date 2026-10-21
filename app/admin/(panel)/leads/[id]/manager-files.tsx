'use client'

import { useRef, useState, useTransition } from 'react'
import { Download, FileText, Paperclip, Trash2, Upload } from 'lucide-react'
import { FILE_KINDS, fileKindLabel, type LeadFileRow } from '@/lib/db'
import { attachFileAction, deleteFileAction } from '@/app/admin/actions'
import { formatDateTime, formatFileSize } from '@/lib/admin-format'
import { uploadFile } from '@/lib/upload-client'
import { cn } from '@/lib/utils'

/** Столько же, сколько разрешает /admin/upload */
const MAX_SIZE = 25 * 1024 * 1024

/**
 * Файлы со стороны компании: дизайн-проект, договор, счёт, фото с замера.
 *
 * Загрузка идёт из браузера напрямую в хранилище, поэтому размер не упирается
 * в лимит серверной функции. Запись в заявку делается уже после — отдельным
 * серверным действием.
 */
export function ManagerFiles({ leadId, files }: { leadId: string; files: LeadFileRow[] }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [kind, setKind] = useState<string>('project')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  async function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return
    setError('')

    for (const file of Array.from(list)) {
      if (file.size > MAX_SIZE) {
        setError(`«${file.name}» больше 25 МБ — такой файл не загрузится.`)
        continue
      }

      setBusy(file.name)
      try {
        const blob = await uploadFile(file, {
          endpoint: '/admin/upload',
          folder: `leads/${leadId}`,
          blobPath: `leads/${leadId}/${Date.now()}-${file.name}`,
        }, 120_000)

        const result = await attachFileAction({
          leadId,
          pathname: blob.pathname,
          name: file.name,
          size: file.size,
          contentType: file.type,
          kind,
        })
        if (!result.ok) setError(result.error ?? 'Не удалось прикрепить файл.')
      } catch (err) {
        console.error(err)
        setError(`Не удалось загрузить «${file.name}». Попробуйте ещё раз.`)
      } finally {
        setBusy(null)
      }
    }

    if (inputRef.current) inputRef.current.value = ''
    // Обновляем список, не перезагружая страницу
    startTransition(() => {})
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Что за файл</span>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="input-admin">
            {FILE_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end">
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-60 sm:w-auto"
          >
            <Upload className="size-4" aria-hidden />
            {busy ? 'Загружаем…' : 'Добавить файл'}
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      </div>

      {busy && (
        <p className="truncate rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground">
          Загружается «{busy}»…
        </p>
      )}
      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {files.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Пока ничего не приложено. Сюда кладут проект, договор, счёт и фотографии с замера — чтобы они не терялись
          в переписке.
        </p>
      ) : (
        <ul className={cn('divide-y divide-border', pending && 'opacity-60')}>
          {files.map((file) => {
            const href = `/admin/file?path=${encodeURIComponent(file.pathname)}`
            const isImage = file.content_type.startsWith('image/')
            return (
              <li key={file.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={href} alt="" className="size-10 rounded-lg object-cover" />
                  ) : (
                    <FileText className="size-5 text-muted-foreground" aria-hidden />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fileKindLabel(file.kind)} · {formatFileSize(Number(file.size))} ·{' '}
                    {formatDateTime(file.created_at)}
                  </p>
                </div>

                <a
                  href={`${href}&download=1`}
                  className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground md:size-10"
                  aria-label={`Скачать ${file.name}`}
                >
                  <Download className="size-4" aria-hidden />
                </a>

                <form action={deleteFileAction} className="shrink-0">
                  <input type="hidden" name="fileId" value={file.id} />
                  <input type="hidden" name="id" value={leadId} />
                  <button
                    type="submit"
                    className="flex size-11 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive md:size-10"
                    aria-label={`Удалить ${file.name}`}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </form>
              </li>
            )
          })}
        </ul>
      )}

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Paperclip className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        До 25 МБ. Файлы лежат в приватном хранилище и открываются только из панели — по прямой ссылке посторонний
        их не получит.
      </p>
    </div>
  )
}
