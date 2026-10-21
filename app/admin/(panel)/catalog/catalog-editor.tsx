'use client'

import { useActionState, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { ImagePlus, RotateCcw } from 'lucide-react'
import { saveCatalogAction } from '@/app/admin/catalog-actions'
import { CATALOG_PLACEHOLDER } from '@/lib/catalog-seed'
import { catalogSectionLabel, type CatalogRow, type CatalogSection } from '@/lib/db'
import { CATALOG_MAX_WIDTH, normalizeCatalogImage } from '@/lib/image-normalize'
import { uploadFile } from '@/lib/upload-client'

const MAX_SIZE = 25 * 1024 * 1024

export function CatalogEditor({
  item,
  section,
  groups,
  groupNote = '',
}: {
  item: CatalogRow | null
  section: CatalogSection
  /** Уже использованные названия групп — подсказками в поле */
  groups: string[]
  /** Описание группы, к которой позиция относится сейчас */
  groupNote?: string
}) {
  const [state, formAction] = useActionState(saveCatalogAction, null)
  const [group, setGroup] = useState(item?.group_title ?? '')
  const [image, setImage] = useState(item?.image ?? CATALOG_PLACEHOLDER)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const hasPhoto = image !== CATALOG_PLACEHOLDER && image !== ''

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError('')
    setNote('')

    if (file.size > MAX_SIZE) {
      setError(`«${file.name}» больше 25 МБ — такой файл не загрузится.`)
      return
    }

    setBusy(true)
    try {
      // Кадрируем и сжимаем до загрузки: в хранилище уходит уже готовый
      // снимок нужного размера, а не оригинал с телефона
      const normalized = await normalizeCatalogImage(file)

      const blob = await uploadFile(normalized.file, {
        endpoint: '/admin/upload',
        folder: `catalog/${section}`,
        blobPath: `catalog/${section}/${normalized.file.name}`,
      }, 120_000)

      setImage(`/media/${blob.pathname}`)
      setNote(
        normalized.warning ??
          `Готово: ${normalized.width}×${normalized.height}, ${Math.round(normalized.file.size / 1024)} КБ.`
      )
    } catch (uploadError) {
      console.error(uploadError)
      setError(
        uploadError instanceof Error && uploadError.message.includes('Браузер не открыл')
          ? uploadError.message
          : `Не удалось загрузить «${file.name}». Попробуйте ещё раз.`
      )
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="id" value={item?.id ?? ''} />
      <input type="hidden" name="section" value={section} />
      <input type="hidden" name="image" value={image} />

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-5">
        <h2 className="mb-4 text-sm font-semibold">Фотография</h2>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <span className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg border border-border bg-secondary sm:w-64">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image || CATALOG_PLACEHOLDER} alt="" className="size-full object-cover" />
          </span>

          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Любое фото автоматически обрезается по центру до пропорции 4:3 и ужимается до{' '}
              {CATALOG_MAX_WIDTH} px по ширине. Поэтому все карточки в каталоге стоят одинаковыми —
              подгонять размер вручную не нужно.
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-60 md:h-10"
              >
                <ImagePlus className="size-4" aria-hidden />
                {busy ? 'Обрабатываем…' : hasPhoto ? 'Заменить фото' : 'Загрузить фото'}
              </button>

              {hasPhoto && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setImage(CATALOG_PLACEHOLDER)
                    setNote('')
                  }}
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium transition hover:bg-secondary disabled:opacity-60 md:h-10"
                >
                  <RotateCcw className="size-4" aria-hidden />
                  Вернуть заглушку
                </button>
              )}

              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="hidden"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
            </div>

            {note && <p className="rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">{note}</p>}
            {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-5">
        <h2 className="mb-1 text-sm font-semibold">Описание позиции</h2>
        <p className="mb-4 text-xs text-muted-foreground">Раздел: {catalogSectionLabel(section)}</p>

        <div className="space-y-4">
          <Field label="Название" hint="Крупная строка на карточке">
            <input
              name="name"
              required
              maxLength={160}
              defaultValue={item?.name ?? ''}
              placeholder="Например, Выдвижная бутылочница"
              className="input-admin"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Подпись" hint="Артикул, размеры, материал — вторая строка">
              <input
                name="meta"
                maxLength={200}
                defaultValue={item?.meta ?? ''}
                placeholder="Ширина 150 мм, цвет антрацит"
                className="input-admin"
              />
            </Field>

            <Field label="Группа" hint="Позиции с одинаковой группой встанут под общим заголовком">
              <input
                name="groupTitle"
                list="catalog-groups"
                maxLength={80}
                defaultValue={item?.group_title ?? ''}
                onChange={(event) => setGroup(event.target.value)}
                placeholder="Системы хранения"
                className="input-admin"
              />
              <datalist id="catalog-groups">
                {groups.map((known) => (
                  <option key={known} value={known} />
                ))}
              </datalist>
            </Field>
          </div>

          <Field
            label="Описание группы"
            hint={
              group.trim()
                ? `Абзац под заголовком «${group.trim()}». Общий для всех позиций этой группы — правится из любой из них.`
                : 'Появится, когда укажете группу'
            }
          >
            <textarea
              name="groupNote"
              rows={2}
              maxLength={600}
              defaultValue={groupNote}
              disabled={!group.trim()}
              placeholder="Чем эта группа отличается, из чего состоит…"
              className="input-admin resize-y disabled:opacity-50"
            />
          </Field>

          <Field label="Подробнее" hint="Необязательно. Короткий абзац под названием в карточке">
            <textarea
              name="description"
              rows={3}
              maxLength={600}
              defaultValue={item?.description ?? ''}
              placeholder="Чем эта позиция удобна, из чего сделана, где применяется…"
              className="input-admin resize-y"
            />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-5">
        <h2 className="mb-4 text-sm font-semibold">Публикация</h2>
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            name="published"
            defaultChecked={item?.published ?? true}
            className="size-5 accent-[var(--primary)]"
          />
          <span className="text-sm">
            Показывать на сайте
            <span className="block text-xs text-muted-foreground">
              Снимите галочку, если позиция ещё готовится — она останется в панели, но пропадёт со страницы.
            </span>
          </span>
        </label>
      </section>

      {state?.error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row-reverse sm:justify-start">
        <SaveButton disabled={busy} />
        <Link
          href={`/admin/catalog?section=${section}`}
          className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-card px-5 text-sm font-medium transition hover:bg-secondary md:h-10"
        >
          Отмена
        </Link>
      </div>
    </form>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground/80">{hint}</span>}
    </label>
  )
}

function SaveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="inline-flex h-11 items-center justify-center rounded-lg bg-foreground px-5 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-60 md:h-10"
    >
      {pending ? 'Сохраняем…' : 'Сохранить позицию'}
    </button>
  )
}
