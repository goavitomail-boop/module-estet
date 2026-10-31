'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Phone, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ModuleEstetMark } from '@/components/module-estet-logo'
import { MaxSocialIcon } from '@/components/max-social-icon'
import { HeaderStatus } from '@/components/contact-status'

/**
 * Пункт меню — либо ссылка, либо группа со списком.
 *
 * Каталожных страниц пять, и по отдельности они занимали всю ширину шапки:
 * на широких экранах ряд упирался в кнопки без единого зазора. Собранные
 * в один пункт, они и помещаются, и находятся быстрее — «Материалы»
 * с «Коллекциями» до этого из шапки вообще не открывались.
 */
type NavLink = { href: string; label: string }
type NavItem = NavLink | { label: string; children: NavLink[] }

const catalogLinks: NavLink[] = [
  { href: '/facades', label: 'Фасады' },
  { href: '/countertops', label: 'Столешницы' },
  { href: '/materials', label: 'Материалы' },
  { href: '/filling', label: 'Наполнение' },
  { href: '/collections', label: 'Коллекции' },
]

const navItems: NavItem[] = [
  { href: '/#services', label: 'Услуги' },
  { href: '/#gallery', label: 'Наши кухни' },
  { href: '/wardrobes', label: 'Шкафы' },
  { label: 'Каталог', children: catalogLinks },
  { href: '/#process', label: 'Как мы работаем' },
  { href: '/kontakty', label: 'Контакты' },
]

const PHONE = { href: 'tel:+79253401211', label: '+7 925 340-12-11' }
const MAX_URL = 'https://web.max.ru/93711404'

function isGroup(item: NavItem): item is { label: string; children: NavLink[] } {
  return 'children' in item
}

/** Всё, на что можно попасть табом внутри шапки, — видимое прямо сейчас */
function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')).filter(
    (element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden'
  )
}

export function SiteHeader({ overHero = false }: { overHero?: boolean }) {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const burgerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Открытое меню: страница под ним не прокручивается, Escape закрывает и
  // возвращает фокус на кнопку, а Tab ходит по кругу внутри шапки — иначе
  // он уходил на страницу, закрытую меню
  useEffect(() => {
    if (!menuOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        burgerRef.current?.focus()
        return
      }
      if (event.key !== 'Tab' || !headerRef.current) return
      const items = focusableIn(headerRef.current)
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (!headerRef.current.contains(active)) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  // Список каталога открывается и мышью, и с клавиатуры — Escape нужен
  // тем, кто пришёл на него табом
  useEffect(() => {
    if (!catalogOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCatalogOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [catalogOpen])

  // Прозрачная шапка поверх тёмного hero — только там, где это уместно
  const transparent = overHero && !scrolled && !menuOpen
  // Светлые надписи: поверх hero и при открытом меню — шапка тогда тёмная,
  // заодно с самим меню, а не светлая полоса над тёмным экраном
  const onDark = transparent || menuOpen
  const catalogCurrent = catalogLinks.some((link) => link.href === pathname)

  return (
    <header
      ref={headerRef}
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-500',
        transparent
          ? 'bg-transparent shadow-none'
          : menuOpen
            ? 'bg-foreground shadow-[0_1px_0_0_color-mix(in_oklab,var(--primary)_30%,transparent)]'
            : scrolled
              ? 'bg-background/95 shadow-[0_1px_0_0_var(--primary)] backdrop-blur-md'
              : 'bg-background/90 shadow-[0_1px_0_0_color-mix(in_oklab,var(--border)_75%,transparent)] backdrop-blur-md'
      )}
    >
      {/* На широком экране шапка шире контента: в 6xl семь пунктов меню
          с кнопками упирались в логотип */}
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:h-20 md:px-6 xl:max-w-7xl xl:px-8">
        <a
          href="/#top"
          className={cn(
            'group flex items-center gap-2.5 transition-colors duration-500 md:gap-3',
            onDark ? 'text-background' : 'text-foreground'
          )}
          aria-label="Модуль Эстет — на главную"
        >
          <ModuleEstetMark className="h-10 w-auto md:h-12 shrink-0" />
          <span className="flex flex-col leading-none">
            <span
              className={cn(
                'text-[1.05rem] md:text-[1.3rem] font-semibold uppercase tracking-[0.14em] transition-colors duration-500',
                onDark ? 'text-background' : 'text-foreground'
              )}
            >
              Модуль Эстет
            </span>
            {/* Вместо подписи «кухни на заказ» — часы работы: на главной
                подпись и так стоит строкой ниже, а статус нужен рядом со звонком */}
            <HeaderStatus
              className={cn(
                'mt-1.5 text-[9px] uppercase tracking-[0.22em] transition-colors duration-500 md:text-[10px]',
                onDark ? 'text-background/70' : 'text-muted-foreground'
              )}
            />
          </span>
        </a>

        <nav className="hidden flex-1 items-center justify-center gap-6 px-8 xl:flex 2xl:gap-8" aria-label="Основная навигация">
          {navItems.map((item) =>
            isGroup(item) ? (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => setCatalogOpen(true)}
                onMouseLeave={() => setCatalogOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setCatalogOpen((value) => !value)}
                  aria-expanded={catalogOpen}
                  aria-haspopup="true"
                  className={cn(
                    'flyer-title flex items-center gap-1 whitespace-nowrap text-sm transition-colors duration-500 hover:text-primary 2xl:text-[15px]',
                    catalogCurrent ? 'text-primary' : onDark ? 'text-background' : 'text-foreground'
                  )}
                >
                  {item.label}
                  <ChevronDown
                    className={cn('size-3.5 transition-transform duration-300', catalogOpen && 'rotate-180')}
                    aria-hidden="true"
                  />
                </button>

                {/* Мостик до панели: без него меню закрывается в зазоре
                    между кнопкой и списком, пока курсор до него едет */}
                <div
                  className={cn(
                    'absolute left-1/2 top-full z-10 w-56 -translate-x-1/2 pt-4 transition-[opacity,transform] duration-200',
                    catalogOpen
                      ? 'visible translate-y-0 opacity-100'
                      : 'invisible -translate-y-1 opacity-0'
                  )}
                >
                  <ul className="overflow-hidden rounded-2xl border border-border bg-background py-1.5 shadow-xl">
                    {item.children.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          onClick={() => setCatalogOpen(false)}
                          aria-current={link.href === pathname ? 'page' : undefined}
                          className={cn(
                            'flyer-title block px-4 py-2.5 text-sm transition-colors hover:bg-secondary hover:text-primary',
                            link.href === pathname ? 'text-primary' : 'text-foreground'
                          )}
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flyer-title whitespace-nowrap text-sm transition-colors duration-500 hover:text-primary 2xl:text-[15px]',
                  onDark ? 'text-background' : 'text-foreground'
                )}
              >
                {item.label}
              </Link>
            )
          )}
        </nav>

        <div className="flex items-center gap-2 md:gap-3">
          {/* Соцсеть Макс в шапке */}
          <a
            href={MAX_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Написать нам в Макс: web.max.ru/93711404"
            title="Написать нам в Max"
            className={cn(
              'group hidden size-10 items-center justify-center rounded-full border transition-all duration-300 hover:scale-105 sm:flex md:size-11',
              onDark
                ? 'border-background/30 bg-background/10 text-background hover:border-primary hover:bg-primary hover:text-primary-foreground'
                : 'border-border text-foreground hover:border-primary hover:bg-primary/10 hover:text-primary'
            )}
          >
            <MaxSocialIcon className="size-5 text-current transition-transform group-hover:scale-110" />
            <span className="sr-only">Написать нам в Max</span>
          </a>

          {/* Прямой звонок — виден всегда, включая телефоны.
              Самый горячий сценарий: «хочу спросить цену прямо сейчас». */}
          <a
            href={PHONE.href}
            aria-label={`Позвонить в Модуль Эстет: ${PHONE.label}`}
            title={PHONE.label}
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 hover:scale-105 md:size-11',
              // На мобильных кнопка залита — иначе теряется рядом с бургером
              onDark
                ? 'border-primary bg-primary/90 text-primary-foreground hover:bg-primary sm:border-background/30 sm:bg-background/10 sm:text-background sm:hover:border-primary sm:hover:bg-primary sm:hover:text-primary-foreground'
                : 'border-primary bg-primary text-primary-foreground hover:bg-foreground hover:text-background sm:border-border sm:bg-transparent sm:text-foreground sm:hover:border-primary sm:hover:bg-primary/10 sm:hover:text-primary'
            )}
          >
            <Phone className="size-5 sm:size-4" aria-hidden="true" />
            <span className="sr-only">Позвонить: {PHONE.label}</span>
          </a>

          <Link
            href="/quiz"
            className="hidden min-h-11 items-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-foreground hover:text-background xl:flex"
          >
            Оставить заявку
          </Link>
          <button
            ref={burgerRef}
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className={cn(
              'relative flex size-11 items-center justify-center rounded-full border-2 border-primary transition-colors duration-300 xl:hidden',
              menuOpen
                ? 'bg-primary text-primary-foreground'
                : onDark
                  ? 'text-background'
                  : 'text-foreground'
            )}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
          >
            <Menu className={cn('absolute size-5 transition-[opacity,transform] duration-300', menuOpen ? 'rotate-90 scale-75 opacity-0' : 'rotate-0 scale-100 opacity-100')} aria-hidden="true" />
            <X className={cn('absolute size-5 transition-[opacity,transform] duration-300', menuOpen ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-75 opacity-0')} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Меню на весь экран под шапкой. Сверху — разделы, они прокручиваются;
          снизу закреплены заявка, звонок и Max: ради них меню часто и
          открывают, и они не должны прятаться за прокруткой */}
      <div
        id="mobile-navigation"
        className={cn(
          'fixed inset-x-0 top-16 flex h-[calc(100dvh-4rem)] flex-col overflow-hidden bg-foreground transition-[opacity,visibility] duration-300 md:top-20 md:h-[calc(100dvh-5rem)] xl:hidden',
          menuOpen ? 'visible opacity-100' : 'pointer-events-none invisible opacity-0'
        )}
        aria-hidden={!menuOpen}
      >
        <div
          className={cn(
            'absolute inset-y-0 right-0 w-px bg-primary/25 transition-transform duration-700',
            menuOpen ? 'translate-x-0' : '-translate-x-24'
          )}
          aria-hidden="true"
        />
        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-2 md:px-6" aria-label="Мобильная навигация">
          <ul className="mx-auto flex max-w-3xl flex-col">
            {navItems.map((item, index) => (
              <li
                key={isGroup(item) ? item.label : item.href}
                className={cn(
                  'border-b border-background/15 transition-[opacity,transform] duration-300 ease-out',
                  menuOpen ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
                )}
                style={{ transitionDelay: menuOpen ? `${40 + index * 35}ms` : '0ms' }}
              >
                {isGroup(item) ? (
                  // На телефоне выпадающий список ни к чему: экран всё равно
                  // отдан меню. Подпись — как у разделов на сайте, ссылки в
                  // две колонки: всё под рукой и вдвое короче по высоте
                  <div className="py-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary">{item.label}</p>
                    <ul className="mt-2 grid grid-cols-2 gap-x-4">
                      {item.children.map((link) => {
                        const current = link.href === pathname
                        return (
                          <li key={link.href}>
                            <Link
                              href={link.href}
                              onClick={() => setMenuOpen(false)}
                              aria-current={current ? 'page' : undefined}
                              className={cn(
                                'flex min-h-12 items-center gap-2.5 transition-colors hover:text-primary active:text-primary',
                                current ? 'text-primary' : 'text-background'
                              )}
                            >
                              <span className={cn('h-px w-4 shrink-0', current ? 'bg-primary' : 'bg-primary/40')} aria-hidden="true" />
                              <span className="flyer-title text-lg leading-none">{link.label}</span>
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-16 items-center py-3 text-background transition-colors hover:text-primary active:text-primary"
                  >
                    <span className="flyer-title text-2xl leading-none">{item.label}</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div
          className={cn(
            'shrink-0 border-t border-background/15 bg-foreground px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 transition-[opacity,transform] duration-300 ease-out md:px-6',
            menuOpen ? 'translate-y-0 opacity-100 delay-150' : 'translate-y-3 opacity-0'
          )}
        >
          <div className="mx-auto flex max-w-3xl flex-col gap-2.5">
            <Link
              href="/quiz"
              onClick={() => setMenuOpen(false)}
              className="flex min-h-12 items-center justify-center rounded-full bg-primary px-5 text-base font-bold text-primary-foreground transition-colors hover:bg-background hover:text-foreground active:bg-background active:text-foreground"
            >
              Оставить заявку
            </Link>
            <div className="grid grid-cols-2 gap-2.5">
              <a
                href={PHONE.href}
                aria-label={`Позвонить: ${PHONE.label}`}
                className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-background/25 px-3 text-sm font-semibold text-background transition-colors hover:border-primary hover:text-primary active:border-primary active:text-primary"
              >
                <Phone className="size-4 shrink-0" aria-hidden="true" />
                Позвонить
              </a>
              <a
                href={MAX_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Написать нам в Max"
                onClick={() => setMenuOpen(false)}
                className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-background/25 px-3 text-sm font-semibold text-background transition-colors hover:border-primary hover:text-primary active:border-primary active:text-primary"
              >
                <MaxSocialIcon className="size-4 shrink-0" />
                Max
              </a>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
