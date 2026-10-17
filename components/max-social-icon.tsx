import React from 'react'
import { cn } from '@/lib/utils'

interface MaxSocialIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  className?: string
  alt?: string
}

/**
 * Фирменный символ соцсети Макс без фона (точный силуэт по предоставленному референсу).
 * Использует mask-image, благодаря чему принимает любой цвет (currentColor),
 * идеально контрастируя на светлом, темном или золотом фоне.
 */
export function MaxSocialIcon({ className, alt = 'Соцсеть Макс', style, ...props }: MaxSocialIconProps) {
  return (
    <span
      role="img"
      aria-label={alt}
      className={cn(
        'relative inline-block shrink-0 select-none align-middle text-current',
        className
      )}
      style={{
        maskImage: "url('/images/max-icon.png')",
        WebkitMaskImage: "url('/images/max-icon.png')",
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        backgroundColor: 'currentColor',
        ...style,
      }}
      {...props}
    />
  )
}

/**
 * Вариант кнопки-ссылки на соцсеть Макс
 */
export function MaxSocialButton({
  href = '#contacts',
  variant = 'sticky',
  className,
}: {
  href?: string
  variant?: 'sticky' | 'header' | 'footer' | 'inline'
  className?: string
}) {
  if (variant === 'sticky') {
    return (
      <a
        href={href}
        aria-label="Перейти в соцсеть Макс"
        title="Соцсеть Макс"
        className={cn(
          'relative flex size-12 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-background text-primary shadow-md transition-all duration-300 hover:scale-105 hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          className
        )}
      >
        <MaxSocialIcon className="size-6" />
        <span className="sr-only">Соцсеть Макс</span>
      </a>
    )
  }

  if (variant === 'header') {
    return (
      <a
        href={href}
        aria-label="Мы в соцсети Макс"
        title="Мы в соцсети Макс"
        className={cn(
          'group flex size-9 items-center justify-center rounded-full border border-primary/30 transition-all duration-300 hover:border-primary hover:bg-primary/10',
          className
        )}
      >
        <MaxSocialIcon className="size-5 transition-transform group-hover:scale-110" />
        <span className="sr-only">Соцсеть Макс</span>
      </a>
    )
  }

  if (variant === 'footer') {
    return (
      <a
        href={href}
        aria-label="Соцсеть Макс Модуль Эстет"
        className={cn(
          'group flex items-center gap-3 rounded-2xl border border-primary/25 bg-background/5 p-3 text-sm font-semibold text-background transition-all duration-300 hover:border-primary hover:bg-primary/15 hover:text-primary',
          className
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/20 p-1 text-primary transition-transform group-hover:scale-105 group-hover:bg-primary group-hover:text-primary-foreground">
          <MaxSocialIcon className="size-6" />
        </span>
        <div className="flex flex-col">
          <span className="leading-tight text-background group-hover:text-primary">Соцсеть Макс</span>
          <span className="text-[11px] font-normal text-background/50">Новости, примеры, акции</span>
        </div>
      </a>
    )
  }

  return (
    <a
      href={href}
      aria-label="Соцсеть Макс"
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-primary/40 px-3.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-primary hover:text-primary-foreground',
        className
      )}
    >
      <MaxSocialIcon className="size-4" />
      <span>Макс</span>
    </a>
  )
}
