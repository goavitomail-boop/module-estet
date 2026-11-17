'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useFormStatus } from 'react-dom'
import { AnimatePresence, m } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { SPRING } from './motion'
import { readFlash } from './toast'

/**
 * Кнопка отправки формы с подтверждением в своём окне вместо confirm().
 *
 * Без JavaScript это обычная кнопка submit — форма уходит сразу, как и раньше
 * (confirm() без скрипта тоже не работал). Со скриптом нажатие открывает окно;
 * «Удалить» отправляет ту же форму с этой же кнопкой (requestSubmit), поэтому
 * useFormStatus и серверный экшен работают как прежде.
 *
 * На телефоне окно прижато к низу — кнопки под большим пальцем.
 */
export function ConfirmSubmit({
  title,
  description,
  confirmLabel = 'Удалить',
  pendingLabel = 'Удаляем…',
  className,
  children,
}: {
  title: string
  description: React.ReactNode
  confirmLabel?: string
  pendingLabel?: React.ReactNode
  className: string
  children: React.ReactNode
}) {
  const { pending } = useFormStatus()
  const [open, setOpen] = useState(false)
  const [portal, setPortal] = useState<HTMLElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const wasPending = useRef(false)
  const titleId = useId()

  useEffect(() => setPortal(document.getElementById('admin-portal')), [])

  // Об успехе сообщает сервер кукой (lib/admin-flash.ts). Если страница
  // осталась на месте (календарь), переход не случился и Toaster сам куку
  // не прочтёт — забираем её, когда форма отработала или кнопка исчезла
  // вместе с удалённой строкой
  useEffect(() => {
    if (pending) wasPending.current = true
    else if (wasPending.current) {
      wasPending.current = false
      readFlash()
    }
  }, [pending])

  useEffect(
    () => () => {
      if (wasPending.current) setTimeout(readFlash, 50)
    },
    []
  )

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const confirm = () => {
    setOpen(false)
    const button = buttonRef.current
    button?.form?.requestSubmit(button)
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="submit"
        disabled={pending}
        onClick={(event) => {
          event.preventDefault()
          setOpen(true)
        }}
        className={className}
      >
        {pending ? pendingLabel : children}
      </button>

      {portal &&
        createPortal(
          <AnimatePresence>
            {open && (
              <div className="fixed inset-0 z-[60] flex items-end justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center">
                <m.div
                  className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
                  onClick={() => setOpen(false)}
                  aria-hidden
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                />
                <m.div
                  role="alertdialog"
                  aria-modal="true"
                  aria-labelledby={titleId}
                  className="relative w-full max-w-sm rounded-xl border border-border bg-popover p-5 text-popover-foreground shadow-[0_30px_80px_-20px_rgb(0_0_0/0.45)]"
                  initial={{ opacity: 0, y: 28, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 16, scale: 0.98, transition: { duration: 0.15 } }}
                  transition={SPRING}
                >
                  <m.span
                    className="mb-3 flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive"
                    initial={{ scale: 0.5, rotate: -12 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.05 }}
                  >
                    <AlertTriangle className="size-5" aria-hidden />
                  </m.span>
                  <h2 id={titleId} className="text-base font-semibold">
                    {title}
                  </h2>
                  <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</div>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <button
                      ref={cancelRef}
                      type="button"
                      onClick={() => setOpen(false)}
                      className="h-11 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary"
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={confirm}
                      className="h-11 rounded-lg bg-destructive text-sm font-medium text-white hover:opacity-90"
                    >
                      {confirmLabel}
                    </button>
                  </div>
                </m.div>
              </div>
            )}
          </AnimatePresence>,
          portal
        )}
    </>
  )
}
