"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AddonChoice, Choice, toggleAddon } from "@/components/order/Choice";
import { Total } from "@/components/order/Total";
import { ADDON_GROUPS, ADDONS, LEAD_CHANNELS, LEAD_LABEL, LeadsSchema, type AddonSelection, type Leads } from "@/lib/addons";
import type { NicheOptions } from "@/lib/sites/catalog";
import type { Hideable } from "@/lib/sites/customize";
import { NICHES } from "@/lib/sites/niches";
import { BriefSchema, type Flow, type NicheId } from "@/lib/sites/schema";
// Гарнитуры тем — для образцов «Аа» в выборе стиля
import "@/sites/fonts";
import s from "./brief.module.css";

type Service = { name: string; price: string };
type Errors = Record<string, string>;

const STEPS = [
  { title: "Чем вы занимаетесь?", why: "От сферы зависят блоки, тексты и интерактивная фишка сайта.", fields: ["niche"] },
  { title: "Расскажите о бизнесе", why: "Из этого напишем тексты: заголовок, рассказ о вас, подписи к блокам.", fields: ["kind", "businessName", "city", "about"] },
  { title: "Услуги и цены", why: "Они появятся на сайте и в окне записи. Типичные услуги мы уже подставили — поправьте под себя.", fields: ["services"] },
  { title: "Что будет на сайте", why: "Мы уже включили всё, что обычно нужно в вашей сфере. Уберите лишнее или добавьте то, что пригодится.", fields: [] },
  { title: "Куда присылать заявки", why: "Когда клиент запишется на сайте, вы сразу об этом узнаете. Можно выбрать несколько способов.", fields: ["leads"] },
  { title: "Контакты и стиль", why: "Телефон и адрес появятся на сайте. Стиль можно поменять потом в кабинете.", fields: ["phone", "address", "hours", "wishes"] },
] as const;

const DRAFT_KEY = "sborka-brief";

/** От ответа зависят кнопки сайта, этапы работы и вопросы-ответы. */
const FLOW_OPTIONS: { id: Flow; title: string; text: string }[] = [
  { id: "booking", title: "Записываются на время", text: "Стрижка, урок, приём, тренировка — клиент выбирает день и час." },
  { id: "order", title: "Оставляют заявку или заказ", text: "Ремонт, доставка, изготовление — сначала обсуждаем задачу и цену." },
  { id: "consult", title: "Приходят за консультацией", text: "Сначала разговор: разбираемся в ситуации и предлагаем план." },
];

/** Услуги для первого шага: у сфер с шаблоном — типичные, у «Другого» — пустые строки. */
function startServices(id: NicheId): Service[] {
  return id === "other" ? [{ name: "", price: "" }, { name: "", price: "" }, { name: "", price: "" }] : NICHES[id].demo.services;
}

/** Бриф из шести коротких шагов: у каждого шага объяснение «зачем», внизу — итог заказа. */
export function BriefForm({
  initialNiche,
  options,
  always,
}: {
  initialNiche?: NicheId;
  options: Record<NicheId, NicheOptions>;
  always: { label: string; why: string }[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(initialNiche ? 1 : 0);
  const [niche, setNiche] = useState<NicheId | undefined>(initialNiche);
  const [values, setValues] = useState({ kind: "", businessName: "", city: "", about: "", phone: "", address: "", hours: "", wishes: "" });
  const [flow, setFlow] = useState<Flow>("booking");
  const [services, setServices] = useState<Service[]>(initialNiche ? startServices(initialNiche) : []);
  const [servicesTouched, setServicesTouched] = useState(false);
  const [hidden, setHidden] = useState<Hideable[]>([]);
  const [addons, setAddons] = useState<AddonSelection[]>([]);
  const [leads, setLeads] = useState<Leads>({ channels: ["telegram"], email: "" });
  const [style, setStyle] = useState(0);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const restored = useRef(false);

  const opts = niche ? options[niche] : undefined;

  // Черновик брифа переживает перезагрузку страницы
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw && !initialNiche) {
        const d = JSON.parse(raw);
        if (d.niche && options[d.niche as NicheId]) setNiche(d.niche);
        if (d.values) setValues((v) => ({ ...v, ...d.values }));
        if (Array.isArray(d.services) && d.services.length) {
          setServices(d.services);
          setServicesTouched(true);
        }
      }
    } catch {
      // Хранилище недоступно — начинаем с чистого листа
    }
    restored.current = true;
  }, [initialNiche, options]);

  useEffect(() => {
    if (!restored.current) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ niche, values, services: servicesTouched ? services : [] }));
    } catch {
      // Не получилось сохранить черновик — не страшно
    }
  }, [niche, values, services, servicesTouched]);

  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const chooseNiche = (id: NicheId) => {
    setNiche(id);
    if (!servicesTouched) setServices(startServices(id));
    setHidden([]);
    setAddons((list) => list.filter((a) => options[id].addons.includes(a.id)));
    setStyle(0);
  };

  // Пустая цена на сайте выглядит как ошибка — пишем «по запросу»
  const brief = {
    niche,
    ...values,
    kind: niche === "other" ? values.kind : "",
    flow,
    services: services
      .filter((sv) => sv.name.trim() || sv.price.trim())
      .map((sv) => ({ ...sv, price: sv.price.trim() || (sv.name.trim() ? "по запросу" : "") })),
  };

  function validate(upTo: number): Errors {
    const found: Errors = {};
    const fields = new Set<string>(STEPS.slice(0, upTo + 1).flatMap((st) => st.fields));
    const result = BriefSchema.safeParse(brief);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = issue.path.join(".");
        if (fields.has(String(issue.path[0])) && !found[key]) found[key] = issue.message;
      }
    }
    if (fields.has("kind") && niche === "other" && values.kind.trim().length < 2) found.kind = "Напишите, чем вы занимаетесь";
    if (fields.has("leads")) {
      const l = LeadsSchema.safeParse(leads);
      if (!l.success) for (const issue of l.error.issues) found[`leads.${issue.path.join(".") || "channels"}`] ??= issue.message;
    }
    if (upTo === STEPS.length - 1 && !consent) found.consent = "Нужно согласие, чтобы мы могли связаться с вами";
    return found;
  }

  function goTo(next: number) {
    setStep(next);
    setErrors({});
    requestAnimationFrame(() => {
      headingRef.current?.focus();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
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
        body: JSON.stringify({ brief, style, hidden, addons, leads }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Не получилось отправить бриф");
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        // ничего
      }
      router.push(`/order/${body.token}?new=1`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Не получилось отправить бриф");
      setSubmitting(false);
    }
  }

  const err = (key: string) =>
    errors[key] ? (
      <p className="field-error" id={`${key}-error`}>
        {errors[key]}
      </p>
    ) : null;
  const invalid = (key: string) => (errors[key] ? { "aria-invalid": true, "aria-describedby": `${key}-error` } : {});
  const placeholders = niche ? NICHES[niche].placeholders : NICHES.nails.placeholders;
  const sample = brief.services[0];

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
      <p className={s.why}>
        {step === 2 && niche === "other"
          ? "Они появятся на сайте и в окне записи. Впишите 2–6 главных услуг — цену можно не указывать."
          : STEPS[step].why}
      </p>

      {step === 0 && (
        <fieldset className={s.fieldset}>
          <legend className="visually-hidden">Сфера бизнеса</legend>
          <div className={s.niches}>
            {Object.values(options).map((n) => (
              <label key={n.id} className={`${s.niche} ${n.id === "other" ? s.nicheOther : ""}`}>
                <input type="radio" name="niche" value={n.id} checked={niche === n.id} onChange={() => chooseNiche(n.id)} />
                {n.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={n.photo} alt="" loading="lazy" />
                ) : (
                  <span className={s.otherArt} aria-hidden="true">
                    <i />
                    <i />
                    <b>?</b>
                  </span>
                )}
                <span>{n.id === "other" ? "Другое — опишу сам" : n.label}</span>
              </label>
            ))}
          </div>
          <p className="field-hint">Нет вашей сферы? Выберите «Другое» — на следующем шаге расскажете о себе своими словами.</p>
          {err("niche")}
        </fieldset>
      )}

      {step === 1 && (
        <div className={s.fields}>
          {niche === "other" && (
            <>
              <div className="field">
                <label className="field-label" htmlFor="kind">
                  Чем вы занимаетесь?
                </label>
                <input id="kind" className="input" value={values.kind} onChange={set("kind")} placeholder="Например: автошкола, ремонт телефонов, курсы английского" maxLength={40} {...invalid("kind")} />
                <p className="field-hint">Коротко, как сказали бы знакомому. По этим словам подберём иконку и тексты.</p>
                {err("kind")}
              </div>
              <fieldset className={s.fieldset}>
                <legend className="field-label">Как к вам приходят клиенты?</legend>
                <div className={s.flows}>
                  {FLOW_OPTIONS.map((f) => (
                    <label key={f.id} className={s.flow}>
                      <input type="radio" name="flow" checked={flow === f.id} onChange={() => setFlow(f.id)} />
                      <span>
                        <b>{f.title}</b>
                        <small>{f.text}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          )}
          <div className="field">
            <label className="field-label" htmlFor="businessName">
              Название
            </label>
            <input id="businessName" className="input" value={values.businessName} onChange={set("businessName")} placeholder={placeholders.businessName} {...invalid("businessName")} />
            <p className="field-hint">Как вас знают клиенты. Будет в шапке сайта и в заголовке вкладки.</p>
            {err("businessName")}
          </div>
          <div className="field">
            <label className="field-label" htmlFor="city">
              Город
            </label>
            <input id="city" className="input" value={values.city} onChange={set("city")} placeholder="Казань" autoComplete="address-level2" {...invalid("city")} />
            <p className="field-hint">Поможет людям из вашего города найти вас в Яндексе.</p>
            {err("city")}
          </div>
          <div className="field">
            <label className="field-label" htmlFor="about">
              Пара слов о вас <span className={s.optional}>необязательно</span>
            </label>
            <textarea id="about" className="input" value={values.about} onChange={set("about")} placeholder={placeholders.about} {...invalid("about")} />
            <p className="field-hint">Чем отличаетесь, сколько лет работаете, что важно клиентам. Можно коротко — допишем сами.</p>
            {err("about")}
          </div>
        </div>
      )}

      {step === 2 && (
        <fieldset className={s.fieldset}>
          <legend className="visually-hidden">Услуги и цены</legend>
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
                    placeholder={niche === "other" ? ["Например: консультация", "Например: выезд мастера", "Например: абонемент"][i % 3] : undefined}
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
                    placeholder="по запросу"
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
          <p className="field-hint">Цену можно не указывать — на сайте будет «по запросу». Список поменяете и в кабинете.</p>
          {err("services")}
        </fieldset>
      )}

      {step === 3 && opts && (
        <div className={s.sections}>
          <section aria-labelledby="included-title">
            <h2 id="included-title" className={s.h2}>
              Входит в цену
            </h2>
            <div className={s.choices}>
              {always.map((a) => (
                <Choice key={a.label} title={a.label} why={a.why} price="Входит" checked locked />
              ))}
              {opts.blocks.map((b) => (
                <Choice
                  key={b.type}
                  title={b.label}
                  why={b.why}
                  price="Входит"
                  checked={!hidden.includes(b.type)}
                  onChange={(on) => setHidden((h) => (on ? h.filter((x) => x !== b.type) : [...h, b.type]))}
                />
              ))}
            </div>
            <p className="field-hint">Команду, отзывы и цифры о вас добавите в кабинете — мы не придумываем их за вас.</p>
          </section>

          {ADDON_GROUPS.filter((g) => g.id !== "service").map((g) => {
            const list = opts.addons.filter((id) => ADDONS[id].group === g.id && ADDONS[id].billing === "once");
            if (!list.length) return null;
            return (
              <section key={g.id} aria-labelledby={`group-${g.id}`}>
                <h2 id={`group-${g.id}`} className={s.h2}>
                  {g.title}
                </h2>
                {g.lead && <p className={s.lead}>{g.lead}</p>}
                <div className={s.choices}>
                  {list.map((id) => (
                    <AddonChoice
                      key={id}
                      addon={ADDONS[id]}
                      selection={addons.find((a) => a.id === id)}
                      onChange={(next) => setAddons((l) => toggleAddon(l, id, next))}
                    />
                  ))}
                </div>
              </section>
            );
          })}
          <section aria-labelledby="group-urgent">
            <h2 id="group-urgent" className={s.h2}>
              Сроки
            </h2>
            <div className={s.choices}>
              <AddonChoice addon={ADDONS.urgent} selection={addons.find((a) => a.id === "urgent")} onChange={(next) => setAddons((l) => toggleAddon(l, "urgent", next))} />
            </div>
          </section>
        </div>
      )}

      {step === 4 && (
        <fieldset className={s.fieldset}>
          <legend className="visually-hidden">Способы получать заявки</legend>
          <div className={s.choices}>
            {LEAD_CHANNELS.map((ch) => (
              <Choice
                key={ch}
                title={LEAD_LABEL[ch].title}
                why={LEAD_LABEL[ch].text}
                price="Входит"
                checked={leads.channels.includes(ch)}
                onChange={(on) =>
                  setLeads((l) => ({ ...l, channels: on ? [...l.channels, ch] : l.channels.filter((x) => x !== ch) }))
                }
              >
                {ch === "email" && (
                  <div className="field">
                    <label className="field-label" htmlFor="lead-email">
                      Почта для заявок
                    </label>
                    <input
                      id="lead-email"
                      type="email"
                      className="input"
                      value={leads.email}
                      onChange={(e) => setLeads((l) => ({ ...l, email: e.target.value }))}
                      placeholder="hello@example.ru"
                      autoComplete="email"
                      {...invalid("leads.email")}
                    />
                    {err("leads.email")}
                  </div>
                )}
              </Choice>
            ))}
          </div>
          {err("leads.channels")}
          <div className={s.message} aria-label="Пример заявки">
            <p className={s.messageHead}>Так выглядит заявка</p>
            <div className={s.bubble}>
              <b>Новая запись с сайта</b>
              <span>Услуга: {sample?.name || "Консультация"}</span>
              <span>Когда: пятница, 15:00</span>
              <span>Имя: Анна, +7 900 000-00-00</span>
            </div>
          </div>
        </fieldset>
      )}

      {step === 5 && opts && (
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

          <fieldset className={s.fieldset}>
            <legend className="field-label">Стиль сайта</legend>
            <div className={s.styles}>
              {opts.styles.map((st, i) => (
                <label key={st.name} className={s.style}>
                  <input type="radio" name="style" checked={style === i} onChange={() => setStyle(i)} />
                  <span className={s.swatch} style={{ background: st.colors.bg, color: st.colors.text }} aria-hidden="true">
                    <em style={{ fontFamily: st.display, fontWeight: st.displayWeight }}>Аа</em>
                    <i style={{ background: st.colors.accent }} />
                    <i style={{ background: st.colors.surface }} />
                  </span>
                  <span className={s.styleText}>
                    <b>«{st.name}»</b>
                    <small>
                      {st.layout} · {st.font}
                    </small>
                  </span>
                </label>
              ))}
            </div>
            <p className="field-hint">Не уверены — оставьте первый. В кабинете можно бесплатно собрать ещё два варианта.</p>
          </fieldset>

          <div className="field">
            <label className="field-label" htmlFor="wishes">
              Пожелания к сайту <span className={s.optional}>необязательно</span>
            </label>
            <textarea id="wishes" className="input" value={values.wishes} onChange={set("wishes")} placeholder="Акцент на онлайн-записи, побольше фото, сайт как у…" {...invalid("wishes")} />
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

      <div className={s.bar}>
        <Total addons={addons} label="Ваш сайт" />
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
      </div>
      <p className={s.payNote}>Оплата — только после того, как посмотрите готовый сайт.</p>
    </form>
  );
}
