"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { NICHE_LIST, NICHES } from "@/lib/sites/niches";
import { BriefSchema, type NicheId } from "@/lib/sites/schema";
import s from "./brief.module.css";

type Service = { name: string; price: string };
type Errors = Record<string, string>;

const STEPS = [
  { title: "Чем вы занимаетесь?", fields: ["niche"] },
  { title: "Расскажите о бизнесе", fields: ["businessName", "city", "about"] },
  { title: "Услуги и цены", fields: ["services"] },
  { title: "Контакты и пожелания", fields: ["phone", "address", "hours", "wishes"] },
] as const;

export function BriefForm({ initialNiche }: { initialNiche?: NicheId }) {
  const router = useRouter();
  const [step, setStep] = useState(initialNiche ? 1 : 0);
  const [niche, setNiche] = useState<NicheId | undefined>(initialNiche);
  const [values, setValues] = useState({ businessName: "", city: "", about: "", phone: "", address: "", hours: "", wishes: "" });
  const [services, setServices] = useState<Service[]>(initialNiche ? NICHES[initialNiche].demo.services : []);
  const [servicesTouched, setServicesTouched] = useState(false);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);

  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const chooseNiche = (id: NicheId) => {
    setNiche(id);
    if (!servicesTouched) setServices(NICHES[id].demo.services);
  };

  const data = { niche, ...values, services: services.filter((sv) => sv.name.trim() || sv.price.trim()) };

  function validate(upTo: number): Errors {
    const result = BriefSchema.safeParse(data);
    const fields = new Set<string>(STEPS.slice(0, upTo + 1).flatMap((st) => st.fields));
    const found: Errors = {};
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = issue.path.join(".");
        if (fields.has(String(issue.path[0])) && !found[key]) found[key] = issue.message;
      }
    }
    if (upTo === STEPS.length - 1 && !consent) found.consent = "Нужно согласие, чтобы мы могли связаться с вами";
    return found;
  }

  function goTo(next: number) {
    setStep(next);
    setErrors({});
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  function onNext() {
    const found = validate(step);
    setErrors(found);
    if (Object.keys(found).length) return;
    goTo(step + 1);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step < STEPS.length - 1) return onNext();
    const found = validate(step);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Не получилось отправить бриф");
      router.push(`/order/${body.token}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Не получилось отправить бриф");
      setSubmitting(false);
    }
  }

  const err = (key: string) =>
    errors[key] ? (
      <p className={"field-error"} id={`${key}-error`}>
        {errors[key]}
      </p>
    ) : null;
  const invalid = (key: string) => (errors[key] ? { "aria-invalid": true, "aria-describedby": `${key}-error` } : {});
  const placeholders = niche ? NICHES[niche].placeholders : NICHES.nails.placeholders;

  return (
    <form className={s.form} onSubmit={onSubmit} noValidate>
      <div className={s.progress}>
        <p className={s.stepCount}>
          Шаг {step + 1} из {STEPS.length}
        </p>
        <div className={s.bars} aria-hidden="true">
          {STEPS.map((st, i) => (
            <span key={st.title} data-state={i < step ? "done" : i === step ? "current" : "next"} />
          ))}
        </div>
      </div>

      <h1 ref={headingRef} tabIndex={-1} className={s.title}>
        {STEPS[step].title}
      </h1>

      {step === 0 && (
        <fieldset className={s.fieldset}>
          <legend className="visually-hidden">Сфера бизнеса</legend>
          <div className={s.niches}>
            {NICHE_LIST.map((n) => (
              <label key={n.id} className={s.niche}>
                <input
                  type="radio"
                  name="niche"
                  value={n.id}
                  checked={niche === n.id}
                  onChange={() => chooseNiche(n.id)}
                />
                <span>{n.label}</span>
              </label>
            ))}
          </div>
          <p className="field-hint">Другие сферы скоро появятся.</p>
          {err("niche")}
        </fieldset>
      )}

      {step === 1 && (
        <div className={s.fields}>
          <div className="field">
            <label className="field-label" htmlFor="businessName">
              Название
            </label>
            <input id="businessName" className="input" value={values.businessName} onChange={set("businessName")} placeholder={placeholders.businessName} {...invalid("businessName")} />
            {err("businessName")}
          </div>
          <div className="field">
            <label className="field-label" htmlFor="city">
              Город
            </label>
            <input id="city" className="input" value={values.city} onChange={set("city")} placeholder="Казань" autoComplete="address-level2" {...invalid("city")} />
            {err("city")}
          </div>
          <div className="field">
            <label className="field-label" htmlFor="about">
              Пара слов о вас <span className={s.optional}>необязательно</span>
            </label>
            <textarea id="about" className="input" value={values.about} onChange={set("about")} placeholder={placeholders.about} {...invalid("about")} />
            <p className="field-hint">Чем отличаетесь, сколько лет работаете, что важно клиентам. ИИ использует это в текстах.</p>
            {err("about")}
          </div>
        </div>
      )}

      {step === 2 && (
        <fieldset className={s.fieldset}>
          <legend className="field-hint">Мы подставили типичные услуги — исправьте их под себя.</legend>
          <div className={s.services}>
            {services.map((sv, i) => (
              <div key={i} className={s.serviceRow}>
                <div className="field">
                  <label className="field-label" htmlFor={`service-${i}-name`}>
                    Услуга {i + 1}
                  </label>
                  <input
                    id={`service-${i}-name`}
                    className="input"
                    value={sv.name}
                    onChange={(e) => {
                      setServicesTouched(true);
                      setServices((list) => list.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)));
                    }}
                    {...invalid(`services.${i}.name`)}
                  />
                  {err(`services.${i}.name`)}
                </div>
                <div className="field">
                  <label className="field-label" htmlFor={`service-${i}-price`}>
                    Цена
                  </label>
                  <input
                    id={`service-${i}-price`}
                    className="input"
                    value={sv.price}
                    placeholder="от 1 000 ₽"
                    onChange={(e) => {
                      setServicesTouched(true);
                      setServices((list) => list.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)));
                    }}
                    {...invalid(`services.${i}.price`)}
                  />
                  {err(`services.${i}.price`)}
                </div>
                <button
                  type="button"
                  className={s.remove}
                  onClick={() => {
                    setServicesTouched(true);
                    setServices((list) => list.filter((_, j) => j !== i));
                  }}
                >
                  Удалить<span className="visually-hidden"> услугу {i + 1}</span>
                </button>
              </div>
            ))}
          </div>
          {services.length < 12 && (
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => {
                setServicesTouched(true);
                setServices((list) => [...list, { name: "", price: "" }]);
              }}
            >
              Добавить услугу
            </button>
          )}
          {err("services")}
        </fieldset>
      )}

      {step === 3 && (
        <div className={s.fields}>
          <div className="field">
            <label className="field-label" htmlFor="phone">
              Телефон для клиентов
            </label>
            <input id="phone" type="tel" className="input" value={values.phone} onChange={set("phone")} placeholder="+7 900 000-00-00" autoComplete="tel" {...invalid("phone")} />
            <p className="field-hint">Он появится на сайте. По нему же мы свяжемся с вами.</p>
            {err("phone")}
          </div>
          <div className="field">
            <label className="field-label" htmlFor="address">
              Адрес <span className={s.optional}>необязательно</span>
            </label>
            <input id="address" className="input" value={values.address} onChange={set("address")} placeholder="ул. Пушкина, 12" autoComplete="street-address" {...invalid("address")} />
            {err("address")}
          </div>
          <div className="field">
            <label className="field-label" htmlFor="hours">
              Часы работы <span className={s.optional}>необязательно</span>
            </label>
            <input id="hours" className="input" value={values.hours} onChange={set("hours")} placeholder="Ежедневно с 10:00 до 21:00" {...invalid("hours")} />
            {err("hours")}
          </div>
          <div className="field">
            <label className="field-label" htmlFor="wishes">
              Пожелания к сайту <span className={s.optional}>необязательно</span>
            </label>
            <textarea id="wishes" className="input" value={values.wishes} onChange={set("wishes")} placeholder="Светлые тона, акцент на онлайн-записи, сайт как у…" {...invalid("wishes")} />
            {err("wishes")}
          </div>
          <div className={s.consent}>
            <input id="consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} {...invalid("consent")} />
            <label htmlFor="consent">
              Согласен на обработку персональных данных по{" "}
              <Link href="/legal/privacy" className="link" target="_blank">
                политике конфиденциальности
              </Link>
            </label>
          </div>
          {err("consent")}
        </div>
      )}

      {submitError && (
        <p className={s.submitError} role="alert">
          {submitError}. Проверьте соединение и попробуйте ещё раз.
        </p>
      )}

      <div className={s.actions}>
        {step > 0 && (
          <button type="button" className="btn btn-secondary" onClick={() => goTo(step - 1)}>
            Назад
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button type="submit" className="btn btn-primary">
            Дальше
          </button>
        ) : (
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Собираем сайт…" : "Собрать сайт"}
          </button>
        )}
      </div>
    </form>
  );
}
