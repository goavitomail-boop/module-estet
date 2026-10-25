"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Booking, BookingField } from "../signature";
import s from "./interactive.module.css";

export interface BookingService {
  name: string;
  price: string;
}

export interface BookingProps {
  config: Booking;
  services: BookingService[];
  masters: Array<{ name: string; role: string }>;
  /** Сайт опубликован: заявка уходит владельцу. В примере и прототипе — только показ. */
  live: boolean;
}

type Value = string | string[] | Record<string, number>;

const WEEKDAYS = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
const MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

/** Первое число в цене: «от 2 400 ₽/кг» → 2400. */
function priceNumber(price: string) {
  const m = price.replace(/[\s ]/g, "").match(/\d+/);
  return m ? Number(m[0]) : 0;
}

const rub = (n: number) => `${n.toLocaleString("ru-RU")} ₽`;

/** Форма записи по шагам: поля шагов из почерка ниши, последний шаг — имя и телефон. */
export function BookingForm({ config, services, masters, live, preset, onDone }: BookingProps & { preset?: string; onDone?: () => void }) {
  const steps = useMemo(
    () =>
      config.steps
        .map((st) => ({ ...st, fields: st.fields.filter((f) => (f.kind === "masters" ? masters.length > 0 : f.kind === "services" ? services.length > 0 : true)) }))
        .filter((st) => st.fields.length > 0),
    [config.steps, masters.length, services.length],
  );
  const total = steps.length + 1;
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, Value>>({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [days, setDays] = useState<Array<{ key: string; top: string; bottom: string }>>([]);

  // Даты считаем в браузере, чтобы не разойтись с сервером
  useEffect(() => {
    const now = new Date();
    setDays(
      Array.from({ length: 10 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
        return {
          key: d.toDateString(),
          top: i === 0 ? "Сегодня" : i === 1 ? "Завтра" : WEEKDAYS[d.getDay()],
          bottom: `${d.getDate()} ${MONTHS[d.getMonth()]}`,
        };
      }),
    );
  }, []);

  // Услуга с кнопки, по которой открыли окно
  useEffect(() => {
    if (!preset) return;
    const field = steps.flatMap((st) => st.fields).find((f) => f.kind === "services");
    if (!field || field.kind !== "services") return;
    const key = `services:${field.label}`;
    setValues((v) => ({ ...v, [key]: field.qty ? { [preset]: 1 } : field.multi ? [preset] : preset }));
  }, [preset, steps]);

  const set = (key: string, value: Value) => setValues((v) => ({ ...v, [key]: value }));

  const toggle = (key: string, option: string, multi?: boolean) => {
    const current = values[key];
    if (!multi) return set(key, current === option ? "" : option);
    const list = Array.isArray(current) ? current : [];
    set(key, list.includes(option) ? list.filter((o) => o !== option) : [...list, option]);
  };

  const sum = useMemo(() => {
    let total = 0;
    for (const [key, value] of Object.entries(values)) {
      if (!key.startsWith("services:") || !value || typeof value !== "object" || Array.isArray(value)) continue;
      for (const [svc, qty] of Object.entries(value)) {
        const found = services.find((x) => x.name === svc);
        if (found) total += priceNumber(found.price) * qty;
      }
    }
    return total;
  }, [values, services]);

  const submit = () => {
    if (name.trim().length < 2) return setError("Как к вам обращаться?");
    if (phone.replace(/\D/g, "").length < 10) return setError("Проверьте номер телефона");
    setError("");
    setDone(true);
    onDone?.();
  };

  if (done) {
    return (
      <div className={s.done}>
        <svg className={s.doneMark} viewBox="0 0 52 52" aria-hidden="true">
          <circle cx="26" cy="26" r="24" />
          <path d="m15 27 7 7 15-16" />
        </svg>
        <h3>Готово, {name.trim()}!</h3>
        <p>{config.done}</p>
        {!live && <p className={s.demoNote}>Это пример: так клиент увидит подтверждение. Заявка никуда не отправлена.</p>}
      </div>
    );
  }

  const field = (f: BookingField, i: number) => {
    const key = `${f.kind}:${f.label}`;
    const value = values[key];
    switch (f.kind) {
      case "services":
        return (
          <fieldset key={i} className={s.field}>
            <legend>{f.label}</legend>
            <div className={s.options}>
              {services.map((svc) => {
                if (f.qty) {
                  const map = (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, number>;
                  const qty = map[svc.name] ?? 0;
                  const change = (d: number) => {
                    const next = { ...map, [svc.name]: Math.max(0, qty + d) };
                    if (!next[svc.name]) delete next[svc.name];
                    set(key, next);
                  };
                  return (
                    <div key={svc.name} className={s.qtyRow} data-on={qty > 0 || undefined}>
                      <span>
                        {svc.name}
                        <small>{svc.price}</small>
                      </span>
                      <span className={s.stepper}>
                        <button type="button" onClick={() => change(-1)} aria-label={`Убрать: ${svc.name}`} disabled={!qty}>
                          −
                        </button>
                        <b>{qty}</b>
                        <button type="button" onClick={() => change(1)} aria-label={`Добавить: ${svc.name}`}>
                          +
                        </button>
                      </span>
                    </div>
                  );
                }
                const on = Array.isArray(value) ? value.includes(svc.name) : value === svc.name;
                return (
                  <button key={svc.name} type="button" className={s.option} aria-pressed={on} onClick={() => toggle(key, svc.name, f.multi)}>
                    <span>{svc.name}</span>
                    <small>{svc.price}</small>
                  </button>
                );
              })}
            </div>
            {f.qty && sum > 0 && (
              <p className={s.sum}>
                Итого: <b>{rub(sum)}</b>
              </p>
            )}
          </fieldset>
        );
      case "chips":
        return (
          <fieldset key={i} className={s.field}>
            <legend>{f.label}</legend>
            <div className={s.chips}>
              {f.options.map((o) => {
                const on = Array.isArray(value) ? value.includes(o) : value === o;
                return (
                  <button key={o} type="button" className={s.chip} aria-pressed={on} onClick={() => toggle(key, o, f.multi)}>
                    {o}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      case "masters":
        return (
          <fieldset key={i} className={s.field}>
            <legend>{f.label}</legend>
            <div className={s.masters}>
              {[{ name: "Любой", role: "Ближайшее время" }, ...masters].map((m) => (
                <button key={m.name} type="button" className={s.master} aria-pressed={value === m.name} onClick={() => toggle(key, m.name)}>
                  <span className={s.masterAvatar}>{m.name === "Любой" ? "★" : m.name[0]}</span>
                  <b>{m.name}</b>
                  <small>{m.role}</small>
                </button>
              ))}
            </div>
          </fieldset>
        );
      case "days":
        return (
          <fieldset key={i} className={s.field}>
            <legend>{f.label}</legend>
            <div className={s.days}>
              {(days.length ? days : Array.from({ length: 10 }, (_, k) => ({ key: String(k), top: "", bottom: "" }))).map((d) => (
                <button key={d.key} type="button" className={s.day} aria-pressed={value === d.key} onClick={() => toggle(key, d.key)} disabled={!d.top}>
                  <small>{d.top}</small>
                  <b>{d.bottom}</b>
                </button>
              ))}
            </div>
          </fieldset>
        );
      case "times":
        return (
          <fieldset key={i} className={s.field}>
            <legend>{f.label}</legend>
            <div className={s.chips}>
              {f.times.map((t) => (
                <button key={t} type="button" className={s.chip} aria-pressed={value === t} onClick={() => toggle(key, t)}>
                  {t}
                </button>
              ))}
            </div>
          </fieldset>
        );
      case "input":
        return (
          <label key={i} className={s.field}>
            <span className={s.legend}>{f.label}</span>
            <input className={s.input} placeholder={f.placeholder} value={(value as string) ?? ""} onChange={(e) => set(key, e.target.value)} />
          </label>
        );
      case "textarea":
        return (
          <label key={i} className={s.field}>
            <span className={s.legend}>{f.label}</span>
            <textarea className={s.input} rows={3} placeholder={f.placeholder} value={(value as string) ?? ""} onChange={(e) => set(key, e.target.value)} />
          </label>
        );
    }
  };

  const last = step === total - 1;
  return (
    <div className={s.booking}>
      <div className={s.progress} aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} data-on={i <= step || undefined} />
        ))}
      </div>
      <p className={s.stepLabel}>
        Шаг {step + 1} из {total} · {last ? "Контакты" : steps[step].title}
      </p>
      <div className={s.stepBody} key={step}>
        {last ? (
          <>
            <label className={s.field}>
              <span className={s.legend}>Имя</span>
              <input className={s.input} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className={s.field}>
              <span className={s.legend}>Телефон</span>
              <input className={s.input} type="tel" autoComplete="tel" placeholder="+7" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            {error && (
              <p className={s.error} role="alert">
                {error}
              </p>
            )}
            <p className={s.consent}>Нажимая кнопку, вы соглашаетесь на обработку персональных данных.</p>
          </>
        ) : (
          steps[step].fields.map(field)
        )}
      </div>
      <div className={s.actions}>
        {step > 0 && (
          <button type="button" className={s.back} onClick={() => setStep(step - 1)}>
            Назад
          </button>
        )}
        <button type="button" className={s.next} onClick={() => (last ? submit() : setStep(step + 1))}>
          {last ? config.submit : "Далее"}
          {sum > 0 && !last && <span> · {rub(sum)}</span>}
        </button>
      </div>
    </div>
  );
}

/**
 * Всплывающее окно записи. Открывается любой кнопкой с data-open="booking" на сайте;
 * data-service на кнопке выбирает услугу заранее. Без скриптов кнопки ведут к контактам.
 */
export function BookingModal(props: BookingProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<string>();
  const [session, setSession] = useState(0);
  const opener = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    document.documentElement.style.overflow = "";
    opener.current?.focus();
  }, []);

  useEffect(() => {
    const root = ref.current?.closest<HTMLElement>("[data-site]");
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      const trigger = (e.target as Element | null)?.closest<HTMLElement>('[data-open="booking"]');
      if (!trigger || !root.contains(trigger)) return;
      e.preventDefault();
      opener.current = trigger;
      setPreset(trigger.dataset.service);
      setSession((n) => n + 1);
      setOpen(true);
      document.documentElement.style.overflow = "hidden";
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <>
      <span ref={ref} hidden />
      <div className={s.modal} data-open={open || undefined} aria-hidden={!open}>
        <div className={s.backdrop} onClick={close} />
        <div className={s.panel} ref={panel} role="dialog" aria-modal="true" aria-label={props.config.title} tabIndex={-1}>
          <button type="button" className={s.close} onClick={close} aria-label="Закрыть">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
          <h2 className={s.modalTitle}>{props.config.title}</h2>
          <p className={s.modalLead}>{props.config.lead}</p>
          {session > 0 && <BookingForm key={session} {...props} preset={preset} />}
        </div>
      </div>
    </>
  );
}
