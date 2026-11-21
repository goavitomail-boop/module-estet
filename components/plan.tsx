import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Детали «чертёжного языка» первого экрана для остального сайта.
 * Стили — в globals.css, блок «ЧЕРТЁЖНЫЙ ЯЗЫК».
 */

/** Метка секции: «02 — Наши кухни» */
export function PlanLabel({ index, children, className }: { index?: number | string; children: ReactNode; className?: string }) {
  const number = typeof index === 'number' ? String(index).padStart(2, '0') : index
  return (
    <p className={cn('plan-label', className)}>
      {number && <span className="plan-label__num">{number}</span>}
      <span className="plan-label__rule" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}

/** Метки обреза снаружи углов. Родитель — relative и без overflow: hidden */
export function CropMarks({ className }: { className?: string }) {
  return (
    <span className={cn('crop-marks', className)} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </span>
  )
}

/** Латунная бирка на фото: мелкий заголовок + значение */
export function PlanTag({ title, value, dot = false, className }: { title?: ReactNode; value: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cn('plan-tag', dot && 'plan-tag--dot', className)}>
      {title && <span className="plan-tag__title">{title}</span>}
      <span className="plan-tag__value">{value}</span>
    </span>
  )
}

/** Размерная линия с засечками и необязательным числом посередине */
export function PlanRule({ label, className }: { label?: ReactNode; className?: string }) {
  return (
    <div className={cn('plan-rule', className)} aria-hidden="true">
      {label && <span className="plan-rule__label">{label}</span>}
    </div>
  )
}

type PlanButtonProps = { children: ReactNode; onDark?: boolean; className?: string } & (
  | ({ href: string } & Omit<ComponentProps<typeof Link>, 'href' | 'className' | 'children'>)
  | ({ href?: undefined } & Omit<ComponentProps<'button'>, 'className' | 'children'>)
)

/** Латунная кнопка-призыв с кружком-стрелкой, как «Создать мою кухню» */
export function PlanButton({ children, onDark = false, className, ...props }: PlanButtonProps) {
  const classes = cn('btn-plan', onDark && 'btn-plan--on-dark', className)
  const content = (
    <>
      <span>{children}</span>
      <span className="btn-plan__icon" aria-hidden="true">
        <ArrowUpRight />
      </span>
    </>
  )
  if (props.href !== undefined) {
    const { href, ...linkProps } = props as { href: string } & Omit<ComponentProps<typeof Link>, 'href'>
    return (
      <Link href={href} className={classes} {...linkProps}>
        {content}
      </Link>
    )
  }
  return (
    <button type="button" className={classes} {...(props as ComponentProps<'button'>)}>
      {content}
    </button>
  )
}
