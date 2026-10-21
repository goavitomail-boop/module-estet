'use client'

import { useActionState, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, ImagePlus, Star, Trash2 } from 'lucide-react'
import { savePortfolioAction } from '@/app/admin/portfolio-actions'
import type { PortfolioPhotoRow, PortfolioRow } from '@/lib/db'
import { cn } from '@/lib/utils'
import { uploadFile } from '@/lib/upload-client'

const MAX_SIZE = 25 * 1024 * 1024
const MAX_PHOTOS = 40

/** Подсказки в выпадающем списке — фильтры галереи собраны по этим названиям */
const STYLES = [
  'Современный',
  'Минимализм',
  'Неоклассика',
  'Современная классика',
  'Скандинавский',
]

export function PortfolioEditor({ project }: { project: PortfolioRow | null }) {
  const [state, formAction] = useActionState(savePortfolioAction, null)
  const [photos, setPhotos] = useState<PortfolioPhotoRow[]>(project?.photos ?? [])
  const [cover, setCover] = useState(project?.cover_src ?? '')
  const [busy, setBusy] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Пока проект не сохранён, id ещё нет — складываем файлы в черновую папку.
  // На адрес фотографии это не влияет: в базе лежит полный путь.
  const folder = project?.id ?? 'draft'

  async function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return
    setUploadError('')

    // Считаем сами: photos из замыкания не успевает обновиться между файлами
    let count = photos.length

    for (const file of Array.from(list)) {
      if (count >= MAX_PHOTOS) {
        setUploadError(`В одном проекте не больше ${MAX_PHOTOS} фотографий.`)
        break
      }
      if (file.size > MAX_SIZE) {
        setUploadError(`«${file.name}» больше 25 МБ — такой файл не загрузится.`)
        continue
      }

      setBusy(file.name)
      try {
        const blob = await uploadFile(file, {
          endpoint: '/admin/upload',
          folder: `portfolio/${folder}`,
          blobPath: `portfolio/${folder}/${file.name}`,
        }, 120_000)

        const src = `/media/${blob.pathname}`
        setPhotos((current) => [...current, { src, alt: '' }])
        setCover((current) => current || src)
        count += 1
      } catch (error) {
        console.error(error)
        setUploadError(`Не удалось загрузить «${file.name}». Попробуйте ещё раз.`)
      } finally {
        setBusy(null)
      }
    }

    if (inputRef.current) inputRef.current.value = ''
  }

  function movePhoto(index: number, direction: -1 | 1) {
    setPhotos((current) => {
      const target = index + direction
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function removePhoto(index: number) {
    setPhotos((current) => {
      const next = current.filter((_, i) => i !== index)
      // Если убрали обложку, назначаем первую оставшуюся — карточка
      // в галерее не должна остаться без картинки
      if (current[index].src === cover) setCover(next[0]?.src ?? '')
      return next
    })
  }

  function setAlt(index: number, alt: string) {
    setPhotos((current) => current.map((photo, i) => (i === index ? { ...photo, alt } : photo)))
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="id" value={project?.id ?? ''} />
      <input type="hidden" name="photos" value={JSON.stringify(photos)} />
      <input type="hidden" name="coverSrc" value={cover} />
      {/* Поля в форме нет, но значение переносим — иначе сохранение молча
          сбрасывало бы его к значению по умолчанию */}
      <input type="hidden" name="size" value={project?.size ?? 'short'} />

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-5">
        <h2 className="mb-4 text-sm font-semibold">Описание проекта</h2>

        <div className="space-y-4">
          <Field label="Название" hint="Видно на карточке в галерее">
            <input
              name="title"
              required
              maxLength={160}
              defaultValue={project?.title ?? ''}
              placeholder="Например, Графит и дуб"
              className="input-admin"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Фасады и материал" hint="Вторая строка под названием">
              <input
                name="tag"
                maxLength={120}
                defaultValue={project?.tag ?? ''}
                placeholder="Матовая эмаль & Кварц"
                className="input-admin"
              />
            </Field>

            <Field label="Стиль" hint="По нему работают фильтры галереи">
              <input
                name="style"
                list="portfolio-styles"
                maxLength={80}
                defaultValue={project?.style ?? ''}
                placeholder="Современный"
                className="input-admin"
              />
              <datalist id="portfolio-styles">
                {STYLES.map((style) => (
                  <option key={style} value={style} />
                ))}
              </datalist>
            </Field>

            <Field label="Площадь" hint="Фильтр «Небольшие» берёт кухни до 10 м²">
              <input
                name="area"
                maxLength={40}
                defaultValue={project?.area ?? ''}
                placeholder="14.2 м²"
                className="input-admin"
              />
            </Field>

            <Field label="Срок изготовления">
              <input
                name="duration"
                maxLength={40}
                defaultValue={project?.duration ?? ''}
                placeholder="4 недели"
                className="input-admin"
              />
            </Field>
          </div>

          <Field label="Описание" hint="Текст в окне проекта под заголовком">
            <textarea
              name="description"
              rows={4}
              maxLength={4000}
              defaultValue={project?.description ?? ''}
              placeholder="Чем эта кухня интересна: планировка, материалы, решения…"
              className="input-admin resize-y"
            />
          </Field>

          <Field label="Что видно на обложке" hint="Читают поисковики и программы чтения с экрана">
            <input
              name="alt"
              maxLength={300}
              defaultValue={project?.alt ?? ''}
              placeholder="Угловая кухня с графитовыми фасадами и дубовой столешницей"
              className="input-admin"
            />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-5">
        <h2 className="mb-1 text-sm font-semibold">Материалы и решения</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          По одному пункту в строке. Показываются списком в окне проекта.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Материалы">
            <textarea
              name="materials"
              rows={6}
              defaultValue={(project?.materials ?? []).join('\n')}
              placeholder={'Фасады: матовая эмаль\nСтолешница: кварцевый агломерат'}
              className="input-admin resize-y"
            />
          </Field>

          <Field label="Решения">
            <textarea
              name="features"
              rows={6}
              defaultValue={(project?.features ?? []).join('\n')}
              placeholder={'Шкафы до потолка\nВстроенная подсветка рабочей зоны'}
              className="input-admin resize-y"
            />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-5">
        <h2 className="mb-1 text-sm font-semibold">Фотографии</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Порядок здесь — это порядок листания у посетителя. Первой ставьте общий вид, дальше детали.
        </p>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-60"
          >
            <ImagePlus className="size-4" aria-hidden />
            {busy ? 'Загружаем…' : 'Добавить фотографии'}
          </button>
          <span className="text-xs text-muted-foreground">
            {photos.length > 0 ? `${photos.length} шт. · JPG, PNG, WebP до 25 МБ` : 'JPG, PNG, WebP до 25 МБ'}
          </span>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/heic,image/avif"
            className="hidden"
            onChange={(event) => handleFiles(event.target.files)}
          />
        </div>

        {/* У проектов, перенесённых из кода, обложка снята отдельно и в списке
            фотографий её нет — показываем, чтобы она не выглядела потерянной */}
        {cover && !photos.some((photo) => photo.src === cover) && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 p-2.5">
            <span className="size-14 shrink-0 overflow-hidden rounded-lg bg-secondary">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover} alt="" className="size-full object-cover" />
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Star className="size-3.5 text-primary" aria-hidden />
                Обложка карточки
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Отдельный кадр, которого нет в списке ниже. Чтобы заменить — нажмите «На обложку» у любой
                фотографии.
              </p>
            </div>
          </div>
        )}

        {busy && (
          <p className="mb-3 truncate rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground">
            Загружается «{busy}»…
          </p>
        )}
        {uploadError && (
          <p className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{uploadError}</p>
        )}

        {photos.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Пока нет фотографий. Проект без них можно сохранить — в галерее он получит подпись «Скоро фотоотчёт».
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {photos.map((photo, index) => {
              const isCover = photo.src === cover
              return (
                <li
                  key={photo.src}
                  className={cn(
                    'overflow-hidden rounded-lg border bg-background',
                    isCover ? 'border-primary ring-1 ring-primary' : 'border-border'
                  )}
                >
                  <div className="relative aspect-[4/3] bg-secondary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.src} alt="" className="size-full object-cover" />
                    {isCover && (
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground">
                        <Star className="size-3" aria-hidden />
                        Обложка
                      </span>
                    )}
                    <span className="absolute right-2 top-2 rounded-full bg-background/90 px-2 py-1 text-[11px] font-medium tabular-nums">
                      {index + 1}
                    </span>
                  </div>

                  <div className="space-y-2 p-2.5">
                    <input
                      value={photo.alt}
                      onChange={(event) => setAlt(index, event.target.value)}
                      maxLength={300}
                      placeholder="Что на фото"
                      aria-label={`Описание фотографии ${index + 1}`}
                      className="input-admin"
                    />
                    <div className="flex items-center gap-1.5">
                      <IconButton
                        label="Левее"
                        disabled={index === 0}
                        onClick={() => movePhoto(index, -1)}
                      >
                        <ArrowLeft className="size-4" aria-hidden />
                      </IconButton>
                      <IconButton
                        label="Правее"
                        disabled={index === photos.length - 1}
                        onClick={() => movePhoto(index, 1)}
                      >
                        <ArrowRight className="size-4" aria-hidden />
                      </IconButton>
                      <button
                        type="button"
                        onClick={() => setCover(photo.src)}
                        disabled={isCover}
                        className="h-11 flex-1 rounded-lg border border-border px-2 text-xs font-medium transition hover:bg-secondary disabled:opacity-40 md:h-9"
                      >
                        {isCover ? 'Это обложка' : 'На обложку'}
                      </button>
                      <IconButton label="Удалить фото" danger onClick={() => removePhoto(index)}>
                        <Trash2 className="size-4" aria-hidden />
                      </IconButton>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-5">
        <h2 className="mb-4 text-sm font-semibold">Публикация</h2>
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            name="published"
            defaultChecked={project?.published ?? true}
            className="size-5 accent-[var(--primary)]"
          />
          <span className="text-sm">
            Показывать на сайте
            <span className="block text-xs text-muted-foreground">
              Снимите галочку, если проект ещё готовится — он останется в панели, но пропадёт из галереи.
            </span>
          </span>
        </label>
      </section>

      {state?.error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row-reverse sm:justify-start">
        <SaveButton />
        <Link
          href="/admin/portfolio"
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

function IconButton({
  label,
  children,
  onClick,
  disabled = false,
  danger = false,
}: {
  label: string
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'flex size-11 shrink-0 items-center justify-center rounded-lg border border-border transition disabled:opacity-40 md:size-9',
        danger ? 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive' : 'hover:bg-secondary'
      )}
    >
      {children}
    </button>
  )
}

function SaveButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center rounded-lg bg-foreground px-5 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-60 md:h-10"
    >
      {pending ? 'Сохраняем…' : 'Сохранить проект'}
    </button>
  )
}
