'use client'

import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence, m } from 'framer-motion'
import { useFloatingHidden } from '@/lib/use-floating-hidden'
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Clock, Info, MapPin, PencilRuler, Phone, Ruler, Sparkles, UserCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FOREIGN_PHONE_MESSAGE, formatRussianPhone, isForeignPhone, isValidRussianPhone, PHONE_PLACEHOLDER } from '@/lib/phone'
import { reachGoal } from '@/lib/metrika'
import { getAttribution } from '@/lib/attribution'
import { LEAD_FAILED_MESSAGE, LeadSubmitError, submitLead } from '@/lib/lead-client'
import { buildMeasurementIcs, downloadIcs } from '@/lib/ics'
import { COMPANY } from '@/lib/company'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { MaxSocialIcon } from '@/components/max-social-icon'
import { PlanLabel } from '@/components/plan'
import { EASE_OUT, FormMotion, itemVariants, riseVariants, stepVariants, successVariants } from '@/components/form-motion'
import { enter } from '@/components/scene-kit'
import { CheckBadge, NextSteps } from '@/components/thanks-scene'
import { BookingScene, SlotDial } from '@/components/booking-scenes'
import { BOOKING_HORIZON_DAYS, bookingLastDay, moscowToday } from '@/lib/measurement-slots'

export const MEASUREMENT_BOOKING_EVENT = 'open-measurement-booking'
export const MEASUREMENT_BOOKING_ALT_EVENT = 'measurement-booking:open'

export function triggerMeasurementBooking() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MEASUREMENT_BOOKING_EVENT))
    window.dispatchEvent(new CustomEvent(MEASUREMENT_BOOKING_ALT_EVENT))
  }
}

const TOTAL_STEPS = 3

// Порядок — от лёгкого к трудному: выбрать дату проще, чем вспоминать
// адрес с номером квартиры. Адрес последним и необязательный — менеджер
// всё равно перезванивает подтвердить запись
const stepContent = [
  {
    eyebrow: 'Время визита',
    title: 'Когда вам удобно встретить мастера?',
    description: 'Замер занимает от 40 до 90 минут. Выберите подходящую дату и диапазон времени.',
    icon: Clock,
  },
  {
    eyebrow: 'Контакты',
    title: 'Кому подтвердить запись?',
    description: 'Мы отправим напоминание и свяжемся за 2 часа до выезда.',
    icon: UserCheck,
  },
  {
    eyebrow: 'Локация объекта',
    title: 'Куда приехать на замер?',
    description: 'Мастер привезёт образцы материалов, лазерный инструмент и каталоги фурнитуры.',
    icon: MapPin,
  },
] as const

const timeSlots = [
  { value: 'morning', label: 'Утро', detail: '09:00 — 12:00' },
  { value: 'day', label: 'День', detail: '13:00 — 16:00' },
  { value: 'evening', label: 'Вечер', detail: '17:00 — 20:00' },
] as const

/** Ответ /api/availability: только цифры занятости, без данных клиентов */
type Availability = {
  capacity: number
  taken: Record<string, Record<string, number>>
  passedToday: string[]
  today: string
  horizonDays: number
}

/** «20 сент., сб» — коротко, чтобы помещалось в кнопку-подсказку */
function formatShortDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', weekday: 'short' })
}

const initialData = {
  city: 'Москва',
  address: '',
  date: '',
  name: '',
  phone: '',
}

function formatBookingDate(dateString: string) {
  if (!dateString) return 'Дата согласовывается'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return dateString
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    weekday: 'short',
  })
}

export function MeasurementBooking() {
  const pathname = usePathname()
  const nearFooter = useFloatingHidden()
  const [open, setOpen] = useState(false)
  const [heroPassed, setHeroPassed] = useState(false)
  const showMobileBar = heroPassed && !open && !nearFooter
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [data, setData] = useState(initialData)
  const [time, setTime] = useState('')
  const [consent, setConsent] = useState(false)
  const [website, setWebsite] = useState('')
  const [startedAt, setStartedAt] = useState(() => Date.now())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const firstFieldRef = useRef<HTMLInputElement>(null)

  const [availability, setAvailability] = useState<Availability | null>(null)

  /**
   * Занятость слотов подгружается при открытии формы, а не при монтировании:
   * виджет висит на каждой странице, и дёргать базу на каждом заходе на сайт
   * незачем. Ошибку глушим — без занятости форма просто работает как раньше,
   * а переполнение слота отловит сервер при отправке.
   */
  useEffect(() => {
    if (!open || availability) return
    let cancelled = false
    fetch('/api/availability')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Availability | null) => { if (!cancelled && data) setAvailability(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [open, availability])

  /** Слот занят, если выбран лимит записей или он сегодня уже начался */
  const isSlotBusy = (date: string, slot: string): boolean => {
    if (!availability || !date) return false
    if (date === availability.today && availability.passedToday.includes(slot)) return true
    const taken = availability.taken[date]?.[slot] ?? 0
    return taken >= availability.capacity
  }

  const dayIsFull = (date: string): boolean =>
    Boolean(availability) && timeSlots.every((slot) => isSlotBusy(date, slot.value))

  /** Ближайшие свободные даты — чтобы не заставлять перебирать календарь вручную */
  const nextFreeDays = useMemo(() => {
    if (!availability) return []
    const result: string[] = []
    const cursor = new Date(`${availability.today}T00:00:00Z`)
    for (let i = 0; i < availability.horizonDays && result.length < 4; i++) {
      const iso = cursor.toISOString().slice(0, 10)
      if (!dayIsFull(iso)) result.push(iso)
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availability])

  // Дату могли поменять на ту, где выбранный слот занят — снимаем выбор,
  // иначе человек уедет на следующий шаг с недоступным временем
  useEffect(() => {
    if (time && data.date && isSlotBusy(data.date, time)) setTime('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.date, availability])

  // «Сегодня» по Москве: от сервера, если занятость уже пришла, иначе по часам
  // браузера в московском поясе — иначе у клиента в Новосибирске «сегодня»
  // наступало бы на четыре часа раньше, чем у нас
  const bookingToday = availability?.today ?? moscowToday()
  const lastBookingDay = useMemo(() => bookingLastDay(bookingToday), [bookingToday])
  const activeStep = stepContent[step - 1]
  const ActiveIcon = activeStep.icon

  // Направление листания для анимации: «Далее» — шаг приходит справа, «Назад» — слева
  const lastStep = useRef(step)
  const direction = step >= lastStep.current ? 1 : -1
  useEffect(() => { lastStep.current = step }, [step])

  useEffect(() => {
    const openBooking = () => {
      setSubmitted(false)
      setStartedAt(Date.now())
      setOpen(true)
    }
    window.addEventListener(MEASUREMENT_BOOKING_EVENT, openBooking)
    window.addEventListener(MEASUREMENT_BOOKING_ALT_EVENT, openBooking)
    return () => {
      window.removeEventListener(MEASUREMENT_BOOKING_EVENT, openBooking)
      window.removeEventListener(MEASUREMENT_BOOKING_ALT_EVENT, openBooking)
    }
  }, [])

  // Форма смонтирована в общем layout и переживает переходы между
  // страницами — ищем hero заново на каждом адресе. Нет hero (внутренние
  // страницы) — нет и мобильной кнопки, как было раньше
  useEffect(() => {
    setHeroPassed(false)
    const hero = document.querySelector('.hero-life')
    if (!hero) return
    const observer = new IntersectionObserver(
      ([entry]) => setHeroPassed(!entry.isIntersecting && entry.boundingClientRect.bottom < 0),
      { threshold: 0 },
    )
    observer.observe(hero)
    return () => observer.disconnect()
  }, [pathname])

  /**
   * Фокус на первое поле — когда шаг доехал на место. Раньше хватало
   * задержки, но теперь новый шаг появляется только после того, как старый
   * уехал, и по таймеру фокус попадал бы в уходящее поле
   */
  const focusFirstField = (definition: unknown) => {
    if (definition === 'center') firstFieldRef.current?.focus({ preventScroll: true })
  }

  function updateData<K extends keyof typeof initialData>(key: K, value: (typeof initialData)[K]) {
    setData((current) => ({ ...current, [key]: value }))
    if (errors[key]) {
      setErrors((current) => {
        const next = { ...current }
        delete next[key]
        return next
      })
    }
  }

  function validateStep(currentStep: number): boolean {
    const nextErrors: Record<string, string> = {}
    if (currentStep === 1) {
      if (!data.date) nextErrors.date = 'Выберите дату замера'
      else if (data.date < bookingToday) nextErrors.date = 'Эта дата уже прошла — выберите другую'
      else if (data.date > lastBookingDay) nextErrors.date = `Запись открыта на ${BOOKING_HORIZON_DAYS} дней вперёд — выберите дату пораньше`
      else if (dayIsFull(data.date)) nextErrors.date = 'На эту дату всё занято — выберите другой день'
      if (!time) nextErrors.time = 'Выберите период времени'
      else if (isSlotBusy(data.date, time)) nextErrors.time = 'Это время уже занято — выберите другое'
    }
    if (currentStep === 2) {
      if (data.name.trim().length < 2) nextErrors.name = 'Укажите ваше имя'
      if (isForeignPhone(data.phone)) nextErrors.phone = FOREIGN_PHONE_MESSAGE
      else if (!isValidRussianPhone(data.phone)) nextErrors.phone = `Введите номер в формате ${PHONE_PLACEHOLDER}`
      if (!consent) nextErrors.consent = 'Необходимо согласие на обработку данных'
    }
    if (currentStep === 3) {
      if (!data.city.trim()) nextErrors.city = 'Укажите город'
      // Адрес необязателен, но если начали вводить — пусть будет похож на адрес
      const address = data.address.trim()
      if (address && address.length < 5) nextErrors.address = 'Укажите улицу, дом и квартиру или оставьте поле пустым'
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function goForward() {
    if (validateStep(step)) setStep((current) => Math.min(current + 1, TOTAL_STEPS))
  }

  function goBack() {
    setErrors({})
    setStep((current) => Math.max(current - 1, 1))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step < TOTAL_STEPS) return goForward()
    if (!validateStep(TOTAL_STEPS) || isSubmitting) return
    setIsSubmitting(true)
    setErrors({})
    try {
      await submitLead({
        type: 'measurement',
        name: data.name,
        phone: data.phone,
        website,
        startedAt,
        attribution: getAttribution(),
        details: { city: data.city, address: data.address, date: data.date, time },
      })
      reachGoal('lead_measurement')
      setSubmitted(true)
    } catch (err: unknown) {
      // Слот заняли, пока человек дозаполнял форму, или время успело пройти
      // (вкладку открыли вчера): обновляем занятость и возвращаем на шаг
      // выбора времени, а не показываем тупик
      if (err instanceof LeadSubmitError && err.data?.slotTaken) {
        const fresh = await fetch('/api/availability').then((r) => (r.ok ? r.json() : null)).catch(() => null)
        if (fresh) setAvailability(fresh)
        setTime('')
        setStep(1)
        setErrors({ time: err.message })
        return
      }
      setErrors({ submit: err instanceof LeadSubmitError ? err.message : LEAD_FAILED_MESSAGE })
    } finally {
      setIsSubmitting(false)
    }
  }

  function resetForm() {
    setSubmitted(false)
    setStep(1)
    setData(initialData)
    setTime('')
    setConsent(false)
    setWebsite('')
    setStartedAt(Date.now())
    setIsSubmitting(false)
    setErrors({})
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) window.setTimeout(resetForm, 220)
  }

  return (
    <FormMotion>
      <div
        className={cn('mobile-booking-bar md:hidden', showMobileBar && 'mobile-booking-bar--visible')}
        aria-hidden={!showMobileBar}
      >
        <Button
          type="button"
          className="h-12 flex-1 rounded-full px-4 text-xs font-bold uppercase tracking-wider sm:px-5 sm:text-sm"
          onClick={() => {
            setSubmitted(false)
            setStartedAt(Date.now())
            setOpen(true)
          }}
          tabIndex={showMobileBar ? 0 : -1}
        >
          Записаться на замер
        </Button>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="booking-dialog flex h-[100dvh] w-[100dvw] max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 p-0 max-sm:inset-0 max-sm:translate-x-0 max-sm:translate-y-0 sm:h-auto sm:max-h-[min(800px,calc(100dvh-2rem))] sm:w-[calc(100%-2rem)] sm:max-w-2xl sm:rounded-3xl sm:border">
          {submitted ? (
            <m.div
              initial="enter"
              animate="center"
              variants={successVariants}
              className="flex min-h-0 flex-1 flex-col items-center justify-center-safe gap-6 overflow-y-auto px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(4rem,env(safe-area-inset-top))] text-center sm:min-h-[600px] sm:px-12"
            >
              <CheckBadge className="size-20 sm:size-24" d={0.1} />
              <m.div variants={riseVariants} className="flex w-full justify-center">
              <DialogHeader className="max-w-md items-center gap-3 text-center">
                {/* Время закрепляется за клиентом только после подтверждения
                    менеджером — обещать «забронировано» сразу нельзя */}
                <DialogTitle className="flyer-title text-balance text-4xl leading-none sm:text-5xl">Заявка на замер принята</DialogTitle>
                <DialogDescription className="text-pretty text-base leading-relaxed sm:text-lg">
                  Менеджер скоро перезвонит и подтвердит время. До звонка оно за вами ещё не закреплено.
                </DialogDescription>
              </DialogHeader>
              </m.div>
              {/* Выбранное время — билетом. Штамп честный: до звонка менеджера
                  время ещё не закреплено, поэтому «ждёт подтверждения» */}
              <m.div variants={riseVariants} className="hs w-full max-w-md">
                <div className="relative">
                  <div
                    className="hs-in overflow-hidden rounded-2xl bg-foreground text-left text-background shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)]"
                    style={enter(0.35, { t: 0.8, from: 'translateY(12%) rotate(-1.5deg)' })}
                  >
                    <div className="flex items-center gap-3 p-4 sm:gap-4 sm:p-5">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-primary/50 text-primary">
                        <CalendarDays className="size-5" aria-hidden="true" />
                      </span>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Замер · бесплатно</span>
                        <span className="flyer-title text-pretty text-xl leading-tight sm:text-2xl">{formatBookingDate(data.date)}</span>
                        <span className="text-sm text-background/70">{timeSlots.find((slot) => slot.value === time)?.detail}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 border-t border-dashed border-background/20 px-4 py-3 text-sm text-background/65 sm:px-5">
                      <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />
                      <span className="truncate">{data.address.trim() ? `${data.city}, ${data.address}` : `${data.city}, адрес уточним по телефону`}</span>
                    </div>
                  </div>
                  <span
                    className="hs-in absolute -right-2 -top-3 rotate-6 rounded-md border-2 border-primary bg-background px-2 py-1 text-[10px] font-black uppercase tracking-wider text-primary shadow-md sm:-right-4 sm:text-xs"
                    style={enter(0.95, { t: 0.5, from: 'scale(1.8)', ease: 'var(--pop)' })}
                  >
                    Ждёт подтверждения
                  </span>
                </div>
              </m.div>
              {/* Что будет дальше и что подготовить. Снимает половину вопросов,
                  с которыми клиент потом звонит менеджеру */}
              <m.div variants={riseVariants} className="w-full max-w-md text-left">
                <NextSteps
                  tone="light"
                  d={1.1}
                  steps={[
                    { icon: Phone, title: 'Менеджер перезвонит', text: 'Подтвердит время — после этого оно закреплено за вами.' },
                    { icon: Ruler, title: 'Замер у вас дома', text: 'От 40 до 90 минут. Мастер привезёт образцы материалов, лазерный инструмент и каталоги фурнитуры.' },
                    { icon: PencilRuler, title: 'Проект и расчёт', text: '3D-проект и смета, стоимость фиксируем в договоре.' },
                  ]}
                />
                <p className="hs hs-in mt-5 flex gap-2.5 rounded-xl bg-muted p-3 text-sm leading-relaxed text-muted-foreground" style={enter(2, { t: 0.6, from: 'translateY(8px)', ease: 'var(--out)' })}>
                  <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  Освободите доступ к стенам, где встанет кухня, — так замер будет точнее.
                </p>
              </m.div>

              <m.div variants={riseVariants} className="flex w-full max-w-md flex-col gap-2.5">
                <Button type="button" size="lg" className="h-12 w-full rounded-full" onClick={() => handleOpenChange(false)}>
                  Вернуться на сайт
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    const ics = buildMeasurementIcs({
                      date: data.date,
                      slot: time,
                      city: data.city,
                      address: data.address,
                      companyPhone: COMPANY.phone,
                    })
                    if (ics) downloadIcs(ics)
                  }}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-primary/40 bg-background font-semibold text-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
                >
                  <CalendarPlus className="size-4 text-primary" aria-hidden="true" />
                  Добавить в календарь
                </button>
                <a
                  href="https://web.max.ru/93711404"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-primary/40 bg-background font-semibold text-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
                >
                  <MaxSocialIcon className="size-4 text-primary" />
                  Написать нам в Max
                </a>
              </m.div>
            </m.div>
          ) : (
            <form className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" onSubmit={handleSubmit} noValidate>
              <div className="sr-only" aria-hidden="true">
                <label htmlFor="booking-website">Ваш сайт</label>
                <input id="booking-website" name="website" value={website} onChange={(event) => setWebsite(event.target.value)} autoComplete="off" tabIndex={-1} />
              </div>

              <header className="shrink-0 border-b bg-background px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-9 sm:pb-5 sm:pt-7">
                <div className="flex flex-col gap-3 pr-8 sm:gap-4">
                  {/* Подпись, заголовок и описание перелистываются вместе с шагом */}
                  <AnimatePresence mode="wait" custom={direction}>
                    <m.div key={step} custom={direction} variants={stepVariants} initial="enter" animate="center" exit="exit" className="flex flex-col gap-3 sm:gap-4">
                      <m.div variants={itemVariants} className="flex items-center justify-between gap-4">
                        <PlanLabel index={step}>{activeStep.eyebrow}</PlanLabel>
                        <span className="font-mono text-xs text-muted-foreground">{step} / {TOTAL_STEPS}</span>
                      </m.div>
                      <div className="flex flex-col gap-1">
                        <m.h2 variants={itemVariants} className="flyer-title text-balance text-2xl sm:text-3xl">{activeStep.title}</m.h2>
                        <m.p variants={itemVariants} className="text-pretty text-xs text-muted-foreground sm:text-sm">{activeStep.description}</m.p>
                      </div>
                    </m.div>
                  </AnimatePresence>
                  {/* Прогресс — линейкой с делениями, как в квизе; деление заполняется латунью слева направо */}
                  <div className="flex gap-1" aria-hidden="true">
                    {stepContent.map((item, index) => (
                      <span key={item.title} className="h-1 flex-1 overflow-hidden rounded-[1px] bg-muted">
                        <span className={cn('block h-full origin-left bg-primary transition-transform duration-500 ease-out', index < step ? 'scale-x-100' : 'scale-x-0')} />
                      </span>
                    ))}
                  </div>
                </div>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-5 sm:px-9 sm:py-6">
                <AnimatePresence mode="wait" custom={direction}>
                <m.div
                  key={step}
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  onAnimationComplete={focusFirstField}
                  className="mx-auto flex max-w-xl flex-col gap-5 sm:gap-6"
                >
                  {/* Сцена шага: лазерный замер, звонок с подтверждением, маршрут к дому (booking-scenes.tsx) */}
                  <BookingScene step={step} date={data.date} time={time} name={data.name} city={data.city} address={data.address} />
                  {step === 3 && (
                    <FieldGroup className="gap-4 sm:gap-5">
                      <Field className="min-w-0" data-invalid={Boolean(errors.city)}>
                        <FieldLabel htmlFor="booking-city">Город</FieldLabel>
                        <Input id="booking-city" name="city" value={data.city} onChange={(event) => updateData('city', event.target.value)} placeholder="Москва" className="h-12 min-w-0 text-base" aria-invalid={Boolean(errors.city)} />
                        {errors.city && <FieldError>{errors.city}</FieldError>}
                      </Field>
                      <Field className="min-w-0" data-invalid={Boolean(errors.address)}>
                        <FieldLabel htmlFor="booking-address">
                          Адрес объекта <span className="font-normal text-muted-foreground">— необязательно</span>
                        </FieldLabel>
                        <Input ref={firstFieldRef} id="booking-address" name="address" value={data.address} onChange={(event) => updateData('address', event.target.value)} autoComplete="street-address" placeholder="ул. Ленина, д. 12, кв. 45" className="h-12 min-w-0 text-base" aria-invalid={Boolean(errors.address)} aria-describedby="booking-address-hint" />
                        <p id="booking-address-hint" className="text-xs text-muted-foreground">
                          Можно не заполнять — менеджер уточнит адрес, когда позвонит подтвердить запись.
                        </p>
                        {errors.address && <FieldError>{errors.address}</FieldError>}
                      </Field>
                    </FieldGroup>
                  )}

                  {step === 1 && (
                    <FieldGroup className="gap-4 sm:gap-5">
                      <Field className="min-w-0" data-invalid={Boolean(errors.date)}>
                        <FieldLabel htmlFor="booking-date">Дата замера</FieldLabel>
                        <Input ref={firstFieldRef} id="booking-date" name="date" type="date" min={bookingToday} max={lastBookingDay} value={data.date} onChange={(event) => updateData('date', event.target.value)} className="h-12 min-w-0 text-base" aria-invalid={Boolean(errors.date)} />
                        {/* Ближайшие свободные даты — сразу под полем даты и не
                            пропадают после выбора: так легко переключиться на
                            соседний день, если нужное время занято */}
                        {nextFreeDays.length > 0 && (
                          <div className="flex flex-wrap gap-2" role="group" aria-label="Ближайшие свободные даты">
                            {nextFreeDays.map((day, index) => {
                              const selected = data.date === day
                              return (
                                // Подсказки появляются по очереди, когда пришла занятость
                                <m.button
                                  key={day}
                                  type="button"
                                  initial={{ opacity: 0, y: 6, scale: 0.94 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  transition={{ duration: 0.35, delay: 0.05 + index * 0.06, ease: EASE_OUT }}
                                  aria-pressed={selected}
                                  // Выбранное время сохраняем: если на новый день оно
                                  // занято, его снимет эффект выше
                                  onClick={() => updateData('date', day)}
                                  className={cn(
                                    'rounded-full border px-3.5 py-2 text-sm transition-colors',
                                    selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-muted',
                                  )}
                                >
                                  {formatShortDate(day)}
                                </m.button>
                              )
                            })}
                          </div>
                        )}
                        {errors.date && <FieldError>{errors.date}</FieldError>}
                      </Field>
                      <fieldset className="flex min-w-0 flex-col gap-3">
                        <legend className="mb-3 text-sm font-medium">Период времени</legend>
                        <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-3 sm:gap-3">
                          {timeSlots.map((slot) => {
                            const selected = time === slot.value
                            const busy = isSlotBusy(data.date, slot.value)
                            return (
                              <button
                                key={slot.value}
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                  setTime(slot.value)
                                  setErrors((current) => {
                                    const next = { ...current }
                                    delete next.time
                                    return next
                                  })
                                }}
                                className={cn(
                                  'flex min-h-14 items-center gap-3 rounded-xl border px-4 py-3 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 min-[380px]:min-h-24 min-[380px]:flex-col min-[380px]:items-start min-[380px]:justify-between min-[380px]:gap-2 min-[380px]:px-3',
                                  busy
                                    ? 'cursor-not-allowed border-border bg-muted/60 text-muted-foreground'
                                    : selected
                                      ? 'border-primary bg-primary text-primary-foreground'
                                      : 'border-border bg-background hover:bg-muted',
                                )}
                                aria-pressed={selected}
                              >
                                {/* Циферблат: дуга — часы визита; выбор прочерчивает её заново */}
                                <SlotDial key={selected ? 'on' : 'off'} slot={slot.value} selected={selected} busy={busy} className="size-9 min-[380px]:size-10" />
                                <span className="flex min-w-0 flex-col gap-0.5">
                                  <span className={cn('font-medium', busy && 'line-through')}>{slot.label}</span>
                                  <span className={cn('text-xs', selected && !busy ? 'text-primary-foreground/75' : 'text-muted-foreground')}>
                                    {busy ? 'Занято' : slot.detail}
                                  </span>
                                </span>
                              </button>
                            )
                          })}
                        </div>

                        {/* Пояснение появляется только когда занято хоть что-то:
                            иначе это лишний текст на пустом месте */}
                        {data.date && dayIsFull(data.date) && (
                          <p className="rounded-xl border border-border bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                            На эту дату всё занято. Выберите другой день — ближайшие свободные даты под полем даты.
                          </p>
                        )}
                        {errors.time && <FieldError>{errors.time}</FieldError>}
                      </fieldset>
                    </FieldGroup>
                  )}

                  {step === 2 && (
                    <FieldGroup className="gap-4 sm:grid sm:grid-cols-2 sm:gap-5">
                      <Field className="min-w-0" data-invalid={Boolean(errors.name)}>
                        <FieldLabel htmlFor="booking-name">Ваше имя</FieldLabel>
                        <Input ref={firstFieldRef} id="booking-name" name="name" value={data.name} onChange={(event) => updateData('name', event.target.value)} autoComplete="name" placeholder="Александр" className="h-12 min-w-0 text-base" aria-invalid={Boolean(errors.name)} />
                        {errors.name && <FieldError>{errors.name}</FieldError>}
                      </Field>
                      <Field className="min-w-0" data-invalid={Boolean(errors.phone)}>
                        <FieldLabel htmlFor="booking-phone">Телефон</FieldLabel>
                        <Input id="booking-phone" name="phone" type="tel" inputMode="tel" value={data.phone} onChange={(event) => updateData('phone', formatRussianPhone(event.target.value))} autoComplete="tel" placeholder={PHONE_PLACEHOLDER} maxLength={18} className="h-12 min-w-0 text-base" aria-invalid={Boolean(errors.phone)} />
                        {errors.phone && <FieldError>{errors.phone}</FieldError>}
                      </Field>
                      <Field orientation="horizontal" data-invalid={Boolean(errors.consent)} className="items-start sm:col-span-2">
                        <Checkbox id="booking-consent" checked={consent} onCheckedChange={(checked) => {
                          setConsent(checked === true)
                          if (checked === true) setErrors((current) => ({ ...current, consent: '' }))
                        }} aria-invalid={Boolean(errors.consent)} />
                        {/* block, а не flex из FieldLabel: иначе текст и ссылка
                            встают двумя колонками */}
                        <FieldLabel htmlFor="booking-consent" className="block cursor-pointer text-xs font-normal leading-relaxed text-muted-foreground">
                          Я согласен на обработку персональных данных для согласования замера и расчёта кухни и принимаю{' '}
                          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground" onClick={(event) => event.stopPropagation()}>
                            политику конфиденциальности
                          </a>
                        </FieldLabel>
                        {errors.consent && <FieldError>{errors.consent}</FieldError>}
                      </Field>
                    </FieldGroup>
                  )}

                  {errors.submit && <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{errors.submit}</div>}
                </m.div>
                </AnimatePresence>
              </div>

              <footer className="shrink-0 border-t bg-background px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-9 sm:py-5">
                <div className="flex items-center justify-between gap-3">
                  {step > 1 ? (
                    <Button type="button" variant="outline" className="h-11 rounded-full px-4 text-xs font-semibold sm:h-12 sm:px-6 sm:text-sm" onClick={goBack}>
                      <ChevronLeft className="mr-1 size-4" /> Назад
                    </Button>
                  ) : <span />}
                  <Button type="submit" disabled={isSubmitting} className="h-11 rounded-full px-5 text-xs font-bold uppercase tracking-wider sm:h-12 sm:px-7 sm:text-sm">
                    {step < TOTAL_STEPS ? (
                      <>
                        Далее <ChevronRight className="ml-1 size-4" />
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 size-4" />
                        {isSubmitting ? 'Отправка...' : 'Отправить заявку на замер'}
                      </>
                    )}
                  </Button>
                </div>
              </footer>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </FormMotion>
  )
}
