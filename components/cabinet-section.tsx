import Image from 'next/image'
import type { CSSProperties, ReactNode } from 'react'
import { CalendarClock, CalendarPlus, Camera, Check, FileText, ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PlanButton, PlanLabel } from '@/components/plan'
import { PlayWhenSeen } from '@/components/play-when-seen'
import { enter, leave, POP } from '@/components/scene-kit'
import { ModuleEstetMark } from '@/components/module-estet-mark'
import { MaxSocialIcon } from '@/components/max-social-icon'
import { ORDER_STAGES, PRODUCTION_DAYS } from '@/lib/cabinet-shared'
import './cabinet-section.css'

/**
 * Личный кабинет на главной: что увидит клиент после договора. Справа —
 * телефон с кабинетом, который отыгрывает заказ, когда блок долистали:
 * этапы доходят до производства, растёт срок изготовления, приходят фото
 * из цеха и сообщение в MAX. Сцена — на приёмах scene-kit (.hs-in,
 * PlayWhenSeen), поэтому без JavaScript и при «уменьшить движение» всё
 * сразу стоит на месте.
 */

const FEATURES = [
  { icon: ListChecks, title: 'Этапы заказа', text: 'Видно, где сейчас ваша мебель: замер, проект, договор, производство, сборка.' },
  { icon: Camera, title: 'Фото с производства', text: 'Корпуса и фасады прямо из цеха — до того, как их привезут.' },
  { icon: CalendarClock, title: 'Визиты и напоминания', text: 'Даты замера, доставки и сборки, напоминание в MAX и кнопка «В календарь».' },
  { icon: FileText, title: 'Проект и документы', text: 'Согласуйте проект в один клик, договор и спецификация всегда под рукой.' },
]

/** Когда этап загорается: первый — с карточкой, дальше — каждые 0,6 с */
const STAGE_AT = [0.95, 1.55, 2.15, 2.75]
const CURRENT = STAGE_AT.length - 1
const DAYS_DONE = 9

const PHOTOS = [
  { src: '/images/workshop.webp', at: 3.45 },
  { src: '/images/assembly/01-carcasses.webp', at: 3.6 },
  { src: '/images/assembly/03-fronts.webp', at: 3.75 },
]

function Card({ d, className, children }: { d: number; className?: string; children: ReactNode }) {
  return (
    <div className={cn('hs-in rounded-xl border border-border bg-card p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]', className)} style={enter(d, { t: 0.7, from: 'translateY(12px)' })}>
      {children}
    </div>
  )
}

/** Этапы: латунная линия доходит до текущего, точки загораются по пути */
function StageTrack() {
  const segments = ORDER_STAGES.length - 1
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        {/* Подпись этапа сменяется вместе с точкой */}
        <span className="relative block h-[1.35em] flex-1 overflow-hidden text-[13px] font-semibold">
          {STAGE_AT.map((at, i) => (
            <span
              key={ORDER_STAGES[i].value}
              className={cn('absolute inset-0', i < CURRENT && 'hs-out')}
              style={i < CURRENT ? leave(STAGE_AT[i + 1], { t: 0.22, to: 'translateY(-100%)' }) : undefined}
            >
              <span className="hs-in block whitespace-nowrap" style={enter(at, { t: 0.45, from: 'translateY(100%)', ease: 'var(--out)' })}>
                {ORDER_STAGES[i].label}
              </span>
            </span>
          ))}
        </span>
        <span className="flex shrink-0 items-center gap-[0.3em] text-[10px] tabular-nums text-muted-foreground">
          этап
          <span className="relative block h-[1.25em] w-[0.6em] overflow-hidden leading-[1.25em]">
            {STAGE_AT.map((at, i) => (
              <span key={i} className={cn('absolute inset-0', i < CURRENT && 'hs-out')} style={i < CURRENT ? leave(STAGE_AT[i + 1], { t: 0.22, to: 'translateY(-100%)' }) : undefined}>
                <span className="hs-in block text-center" style={enter(at, { t: 0.45, from: 'translateY(100%)', ease: 'var(--out)' })}>
                  {i + 1}
                </span>
              </span>
            ))}
          </span>
          из {ORDER_STAGES.length}
        </span>
      </div>
      <div className="relative mt-2.5 flex h-3 items-center justify-between">
        <span className="absolute inset-x-1.5 top-1/2 flex h-0.5 -translate-y-1/2">
          {Array.from({ length: segments }, (_, i) => (
            <span key={i} className="relative flex-1 bg-border">
              {i < CURRENT && (
                <span className="cab-fill absolute inset-0 origin-left bg-primary" style={{ '--d': `${STAGE_AT[i] + 0.05}s` } as CSSProperties} />
              )}
            </span>
          ))}
        </span>
        {ORDER_STAGES.map((stage, i) => (
          <span key={stage.value} className="relative size-3 rounded-full border-2 border-border bg-card">
            {i <= CURRENT && (
              <span className="hs-in absolute -inset-0.5 rounded-full bg-primary" style={enter(STAGE_AT[i], { t: 0.5, from: 'scale(0.2)', ease: 'var(--pop)' })} />
            )}
            {i === CURRENT && <span className="cab-ring absolute -inset-1.5 rounded-full border border-primary" style={{ '--d': `${STAGE_AT[i] + 0.4}s` } as CSSProperties} />}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Экран кабинета внутри телефона */
function CabinetScreen() {
  return (
    <div className="flex flex-col gap-2.5 px-3 pb-6 pt-2 text-foreground">
      <div className="hs-in flex items-center justify-between py-1.5" style={enter(0.35, { t: 0.6, from: 'translateY(-6px)' })}>
        <span className="flex items-center gap-2">
          <ModuleEstetMark className="size-6" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Кабинет</span>
        </span>
        <span className="flex size-7 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold">АС</span>
      </div>

      <div className="hs-in px-0.5" style={enter(0.5, { t: 0.7 })}>
        <p className="text-[18px] font-semibold leading-tight">Здравствуйте, Анна</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">Кухня «Гарда» · заказ № 24</p>
      </div>

      <Card d={0.7}>
        <StageTrack />
        <p className="hs-in mt-2.5 text-[10.5px] leading-snug text-muted-foreground" style={enter(STAGE_AT[CURRENT] + 0.15, { t: 0.5, from: 'translateY(4px)' })}>
          {ORDER_STAGES[CURRENT].hint.split('.')[0]}.
        </p>
      </Card>

      <Card d={1.2}>
        <div className="flex items-baseline justify-between text-[11px]">
          <span className="font-semibold">Изготовление</span>
          <span className="hs-fade tabular-nums text-muted-foreground" style={{ '--d': '3s' } as CSSProperties}>
            {DAYS_DONE} из {PRODUCTION_DAYS} дней
          </span>
        </div>
        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-secondary">
          <span
            className="cab-fill block h-full origin-left rounded-full bg-primary"
            style={{ width: `${Math.round((DAYS_DONE / PRODUCTION_DAYS) * 100)}%`, '--d': '2.95s', '--t': '1.3s' } as CSSProperties}
          />
        </span>
      </Card>

      <Card d={1.4}>
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold">Фотоотчёт</span>
          <span className="hs-in rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-accent-foreground" style={enter(3.9, POP)}>
            +3 новых
          </span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {PHOTOS.map((p) => (
            <span key={p.src} className="relative aspect-square overflow-hidden rounded-lg bg-secondary">
              <span className="hs-in absolute inset-0" style={enter(p.at, { t: 0.6, from: 'scale(0.82)', ease: 'var(--pop)' })}>
                <Image src={p.src} alt="" fill sizes="96px" className="object-cover" />
              </span>
            </span>
          ))}
        </div>
      </Card>

      <Card d={1.6} className="flex items-center gap-2.5">
        <span className="flex size-9 shrink-0 flex-col items-center justify-center rounded-lg bg-secondary leading-none">
          <span className="text-[13px] font-bold">28</span>
          <span className="text-[8px] uppercase text-muted-foreground">ноя</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold">Доставка</span>
          <span className="block text-[10px] text-muted-foreground">пятница, 10:00</span>
        </span>
        <span className="flex shrink-0 items-center gap-1 rounded-md border border-border px-1.5 py-1 text-[9.5px] font-medium">
          <CalendarPlus className="size-3" aria-hidden="true" />В календарь
        </span>
      </Card>
    </div>
  )
}

export function CabinetSection() {
  return (
    <section id="kabinet" className="overflow-x-clip bg-background py-16 md:py-24" aria-labelledby="kabinet-title">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 md:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <div data-anim>
            <PlanLabel index={8} className="mb-4">
              Личный кабинет
            </PlanLabel>
            <h2 id="kabinet-title" className="flyer-title text-balance text-3xl text-foreground md:text-5xl">
              Весь заказ — в&nbsp;личном кабинете
            </h2>
            <p className="mt-4 max-w-xl text-pretty leading-relaxed text-muted-foreground">
              Не нужно звонить и уточнять, как дела у кухни. Этапы, фото с производства, даты визитов и документы — на одной
              странице, а о главном напомним в MAX.
            </p>
          </div>

          <ul className="mt-8 grid gap-x-6 gap-y-5 sm:grid-cols-2" data-anim="stagger">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/50 text-primary">
                  <Icon className="size-[18px]" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-semibold text-foreground">{title}</span>
                  <span className="mt-1 block text-pretty text-sm leading-relaxed text-muted-foreground">{text}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5" data-anim>
            <PlanButton href="/kabinet/vhod" className="w-full sm:w-fit">
              Войти в кабинет
            </PlanButton>
            <p className="max-w-[16rem] text-sm leading-snug text-muted-foreground">Доступ открывает менеджер, когда вы оформляете заказ.</p>
          </div>
        </div>

        {/* Телефон с кабинетом на чертёжной бумаге */}
        <div className="paper relative overflow-hidden rounded-3xl border-2 border-primary px-4 pb-12 pt-24" aria-hidden="true">
          <PlayWhenSeen className="relative mx-auto w-[16.5rem] md:w-[18.5rem]">
            <div
              className="hs-in relative rounded-[2.6rem] border border-black/40 bg-[#171513] p-2 shadow-[0_40px_70px_-30px_rgba(0,0,0,0.55)]"
              style={enter(0, { t: 0.9, from: 'translateY(28px) scale(0.97)' })}
            >
              <div className="relative h-[33rem] overflow-hidden rounded-[2.1rem] bg-[var(--paper)] md:h-[36rem]">
                {/* Строка состояния и вырез */}
                <div className="flex h-8 items-center justify-between px-6 text-[10px] font-semibold text-foreground">
                  <span className="tabular-nums">9:41</span>
                  <span className="absolute left-1/2 top-2 h-[1.15rem] w-[4.6rem] -translate-x-1/2 rounded-full bg-[#171513]" />
                  <span className="flex items-center gap-1">
                    <span className="flex items-end gap-px">
                      {[3, 5, 7, 9].map((h) => (
                        <span key={h} className="w-[2px] rounded-sm bg-foreground" style={{ height: h }} />
                      ))}
                    </span>
                    <span className="ml-1 h-[9px] w-[18px] rounded-[3px] border border-foreground/70 p-px">
                      <span className="block h-full w-3/4 rounded-[1px] bg-foreground" />
                    </span>
                  </span>
                </div>
                <CabinetScreen />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[var(--paper)] to-transparent" />
              </div>
            </div>

            {/* Сообщение в MAX, когда пришли фото: висит над телефоном, как пуш,
                и закрывает только строку состояния */}
            <div
              className="hs-in absolute -left-3 -top-[4.25rem] z-10 flex w-[15rem] items-start gap-2.5 rounded-2xl border border-border bg-card/95 p-3 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.35)] backdrop-blur sm:-left-10 sm:w-[16rem]"
              style={enter(4.05, { t: 0.7, from: 'translateY(-14px) scale(0.92)', ease: 'var(--pop)' })}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
                <MaxSocialIcon className="size-4" alt="" />
              </span>
              <span className="min-w-0 text-[11px] leading-snug">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-foreground">Модуль Эстет</span>
                  <span className="text-[9.5px] text-muted-foreground">сейчас</span>
                </span>
                <span className="block text-muted-foreground">Добавили 3 фото с производства. Посмотреть — в личном кабинете</span>
              </span>
            </div>

            {/* Проект согласован — когда этап сменился на «Договор» */}
            <div
              className="hs-in absolute -bottom-4 -right-3 z-10 flex items-center gap-1.5 rounded-full border border-primary/60 bg-foreground px-3.5 py-2 text-[11px] font-semibold text-background shadow-lg sm:-right-10"
              style={enter(STAGE_AT[2] + 0.1, POP)}
            >
              <Check className="size-3.5 text-primary" aria-hidden="true" />
              Проект согласован
            </div>
          </PlayWhenSeen>
        </div>
      </div>
    </section>
  )
}
