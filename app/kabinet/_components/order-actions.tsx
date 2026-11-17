'use client'

import { useState, useTransition } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { CalendarClock, Check, Loader2, PenLine, Send } from 'lucide-react'
import { toast } from '@/app/admin/_components/toast'
import { SPRING } from '@/app/admin/_components/motion'
import { approveProjectAction, askManagerAction, requestChangesAction, requestRescheduleAction, type FormState } from '../actions'

function useAction() {
  const [pending, start] = useTransition()
  const run = (task: () => Promise<FormState>, onOk?: () => void) =>
    start(async () => {
      try {
        const result = await task()
        if (result?.error) toast.error(result.error)
        else {
          if (result?.message) toast.success(result.message)
          onOk?.()
        }
      } catch {
        toast.error('Не получилось — проверьте связь и повторите.')
      }
    })
  return { pending, run }
}

const textarea =
  'w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-base outline-none transition-[border-color,box-shadow] focus:border-ring focus:ring-[3px] focus:ring-ring/25 md:text-sm'

/**
 * Проект ждёт ответа: «Согласовать» или «Есть правки» с комментарием.
 * Ответ сразу уходит менеджеру в MAX и остаётся в ленте заказа.
 */
export function ProjectApproval({ orderId }: { orderId: string }) {
  const { pending, run } = useAction()
  const [changes, setChanges] = useState(false)
  const [comment, setComment] = useState('')

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => approveProjectAction(orderId))}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-foreground px-5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-60"
        >
          {pending && !changes ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
          Согласовать проект
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setChanges((v) => !v)}
          aria-expanded={changes}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-card px-5 text-sm font-medium hover:bg-secondary disabled:opacity-60"
        >
          <PenLine className="size-4" aria-hidden />
          Есть правки
        </button>
      </div>
      <AnimatePresence initial={false}>
        {changes && (
          <m.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
            className="overflow-hidden"
            onSubmit={(event) => {
              event.preventDefault()
              run(() => requestChangesAction(orderId, comment), () => setComment(''))
            }}
          >
            <div className="space-y-2 pt-3">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                required
                autoFocus
                placeholder="Например: верхние шкафы до потолка, ручки латунные, мойку ближе к окну"
                className={textarea}
              />
              <button
                type="submit"
                disabled={pending || comment.trim().length < 3}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-foreground text-sm font-medium text-background hover:opacity-90 disabled:opacity-50 sm:w-auto sm:px-5"
              >
                {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
                Отправить правки
              </button>
            </div>
          </m.form>
        )}
      </AnimatePresence>
    </div>
  )
}

/** «Попросить перенести» под визитом: раскрывается поле, куда писать удобное время */
export function RescheduleButton({ visitId }: { visitId: string }) {
  const { pending, run } = useAction()
  const [open, setOpen] = useState(false)
  const [comment, setComment] = useState('')

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <CalendarClock className="size-3.5" aria-hidden />
        Перенести
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <m.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={SPRING}
            className="overflow-hidden"
            onSubmit={(event) => {
              event.preventDefault()
              run(() => requestRescheduleAction(visitId, comment), () => {
                setComment('')
                setOpen(false)
              })
            }}
          >
            <div className="flex gap-2 pt-2">
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                autoFocus
                placeholder="Когда удобно? Например: в субботу после 12"
                className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-base outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/25 md:text-sm"
              />
              <button
                type="submit"
                disabled={pending || comment.trim().length < 3}
                aria-label="Отправить"
                className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-foreground text-background disabled:opacity-50"
              >
                {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
              </button>
            </div>
          </m.form>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Вопрос менеджеру прямо из заказа */
export function AskManager({ orderId }: { orderId: string }) {
  const { pending, run } = useAction()
  const [text, setText] = useState('')
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        run(() => askManagerAction(orderId, text), () => setText(''))
      }}
      className="space-y-2"
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Задать вопрос по заказу…"
        className={textarea}
      />
      <button
        type="submit"
        disabled={pending || text.trim().length < 3}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary disabled:opacity-50"
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
        Отправить менеджеру
      </button>
    </form>
  )
}
