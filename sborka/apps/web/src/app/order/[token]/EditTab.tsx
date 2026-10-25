"use client";

import { useState, type ReactNode } from "react";
import { Choice } from "@/components/order/Choice";
import type { BlockOption } from "@/lib/sites/catalog";
import type { Custom, Hideable } from "@/lib/sites/customize";
import s from "./cabinet.module.css";

type Service = { name: string; price: string };

export interface EditData {
  businessName: string;
  city: string;
  about: string;
  phone: string;
  address: string;
  hours: string;
  services: Service[];
  /** Наши тексты первого экрана — подсказка в полях, если клиент свои не вписал. */
  hero: { title: string; subtitle: string; cta: string };
}

/** Сохранить раздел; anchors — куда прокрутить сайт, чтобы показать изменение. */
export type SaveEdit = (body: Record<string, unknown>, anchors: string[]) => Promise<boolean>;

/**
 * Вкладка «Изменить»: формы вместо описаний словами. Сохранение сразу пересобирает
 * сайт и не тратит бесплатные правки.
 */
export function EditTab({
  data,
  custom,
  blocks,
  onSave,
  busy,
}: {
  data: EditData;
  custom: Custom;
  blocks: BlockOption[];
  onSave: SaveEdit;
  busy: string | null;
}) {
  return (
    <div className={s.stack}>
      <p className={s.text}>Меняйте сами — сайт обновится за пару секунд. Бесплатные правки при этом не тратятся.</p>
      <ServicesEditor initial={data.services} onSave={onSave} busy={busy} />
      <TextsEditor data={data} custom={custom} onSave={onSave} busy={busy} />
      <ContactsEditor data={data} onSave={onSave} busy={busy} />
      <BlocksEditor blocks={blocks} hidden={custom.hidden} onSave={onSave} busy={busy} />
      <TeamEditor initial={custom.team} onSave={onSave} busy={busy} />
      <ReviewsEditor initial={custom.reviews} onSave={onSave} busy={busy} />
      <StatsEditor initial={custom.stats} onSave={onSave} busy={busy} />
    </div>
  );
}

function Section({ title, hint, children, open }: { title: string; hint: string; children: ReactNode; open?: boolean }) {
  return (
    <details className={s.editor} open={open}>
      <summary>
        <b>{title}</b>
        <small>{hint}</small>
      </summary>
      <div className={s.editorBody}>{children}</div>
    </details>
  );
}

function SaveButton({ busy, action, disabled }: { busy: string | null; action: string; disabled?: boolean }) {
  return (
    <button type="submit" className="btn btn-primary btn-small" disabled={busy !== null || disabled}>
      {busy === action ? "Сохраняем…" : "Сохранить и показать"}
    </button>
  );
}

function ServicesEditor({ initial, onSave, busy }: { initial: Service[]; onSave: SaveEdit; busy: string | null }) {
  const [list, setList] = useState(initial);
  const valid = list.length > 0 && list.every((x) => x.name.trim());
  return (
    <Section title="Услуги и цены" hint="Добавить, убрать, поменять цену" open>
      <form
        className={s.form}
        onSubmit={(e) => {
          e.preventDefault();
          const services = list.map((x) => ({ name: x.name.trim(), price: x.price.trim() || "по запросу" }));
          onSave({ section: "services", services }, ["services", "feature"]);
        }}
      >
        {list.map((sv, i) => (
          <div key={i} className={s.row}>
            <input className="input" aria-label={`Услуга ${i + 1}`} value={sv.name} placeholder="Название" onChange={(e) => setList((l) => l.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <input className={`input ${s.priceInput}`} aria-label={`Цена услуги ${i + 1}`} value={sv.price} placeholder="по запросу" onChange={(e) => setList((l) => l.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
            <button type="button" className={s.removeRow} aria-label={`Удалить услугу ${i + 1}`} onClick={() => setList((l) => l.filter((_, j) => j !== i))} disabled={list.length === 1}>
              ×
            </button>
          </div>
        ))}
        <div className={s.formActions}>
          {list.length < 12 && (
            <button type="button" className="btn btn-secondary btn-small" onClick={() => setList((l) => [...l, { name: "", price: "" }])}>
              Добавить услугу
            </button>
          )}
          <SaveButton busy={busy} action="services" disabled={!valid} />
        </div>
      </form>
    </Section>
  );
}

function TextsEditor({ data, custom, onSave, busy }: { data: EditData; custom: Custom; onSave: SaveEdit; busy: string | null }) {
  const [v, setV] = useState({
    businessName: data.businessName,
    city: data.city,
    about: data.about,
    title: custom.hero.title ?? "",
    subtitle: custom.hero.subtitle ?? "",
    cta: custom.hero.cta ?? "",
  });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((x) => ({ ...x, [k]: e.target.value }));
  return (
    <Section title="Тексты" hint="Название, главный заголовок, рассказ о вас">
      <form
        className={s.form}
        onSubmit={(e) => {
          e.preventDefault();
          onSave(
            { section: "texts", businessName: v.businessName, city: v.city, about: v.about, hero: { title: v.title, subtitle: v.subtitle, cta: v.cta } },
            [],
          );
        }}
      >
        <Field id="ed-name" label="Название">
          <input id="ed-name" className="input" value={v.businessName} onChange={set("businessName")} />
        </Field>
        <Field id="ed-city" label="Город">
          <input id="ed-city" className="input" value={v.city} onChange={set("city")} />
        </Field>
        <Field id="ed-title" label="Главный заголовок" hint="Оставьте пустым — будет наш вариант.">
          <textarea id="ed-title" className={`input ${s.short}`} value={v.title} onChange={set("title")} placeholder={data.hero.title} maxLength={120} />
        </Field>
        <Field id="ed-sub" label="Подзаголовок">
          <textarea id="ed-sub" className={`input ${s.short}`} value={v.subtitle} onChange={set("subtitle")} placeholder={data.hero.subtitle} maxLength={240} />
        </Field>
        <Field id="ed-cta" label="Надпись на главной кнопке">
          <input id="ed-cta" className="input" value={v.cta} onChange={set("cta")} placeholder={data.hero.cta} maxLength={30} />
        </Field>
        <Field id="ed-about" label="О вас" hint="Из этого текста собирается блок «О нас».">
          <textarea id="ed-about" className="input" value={v.about} onChange={set("about")} maxLength={600} />
        </Field>
        <div className={s.formActions}>
          <SaveButton busy={busy} action="texts" disabled={v.businessName.trim().length < 2 || v.city.trim().length < 2} />
        </div>
      </form>
    </Section>
  );
}

function ContactsEditor({ data, onSave, busy }: { data: EditData; onSave: SaveEdit; busy: string | null }) {
  const [v, setV] = useState({ phone: data.phone, address: data.address, hours: data.hours });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((x) => ({ ...x, [k]: e.target.value }));
  return (
    <Section title="Контакты" hint="Телефон, адрес, часы работы">
      <form
        className={s.form}
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ section: "contacts", ...v }, ["contacts"]);
        }}
      >
        <Field id="ed-phone" label="Телефон">
          <input id="ed-phone" type="tel" className="input" value={v.phone} onChange={set("phone")} autoComplete="tel" />
        </Field>
        <Field id="ed-address" label="Адрес">
          <input id="ed-address" className="input" value={v.address} onChange={set("address")} />
        </Field>
        <Field id="ed-hours" label="Часы работы">
          <input id="ed-hours" className="input" value={v.hours} onChange={set("hours")} placeholder="Ежедневно с 10:00 до 21:00" />
        </Field>
        <div className={s.formActions}>
          <SaveButton busy={busy} action="contacts" disabled={v.phone.trim().length < 5} />
        </div>
      </form>
    </Section>
  );
}

function BlocksEditor({ blocks, hidden, onSave, busy }: { blocks: BlockOption[]; hidden: Hideable[]; onSave: SaveEdit; busy: string | null }) {
  const [list, setList] = useState(hidden);
  return (
    <Section title="Блоки на странице" hint="Убрать лишнее или вернуть обратно">
      <div className={s.choices}>
        {blocks.map((b) => (
          <Choice
            key={b.type}
            title={b.label}
            why={b.why}
            price="Входит"
            checked={!list.includes(b.type)}
            onChange={async (on) => {
              if (busy) return;
              const next = on ? list.filter((x) => x !== b.type) : [...list, b.type];
              setList(next);
              if (!(await onSave({ section: "blocks", hidden: next }, on ? [b.type] : []))) setList(list);
            }}
          />
        ))}
      </div>
    </Section>
  );
}

function TeamEditor({ initial, onSave, busy }: { initial: Custom["team"]; onSave: SaveEdit; busy: string | null }) {
  const [list, setList] = useState(initial);
  return (
    <Section title="Команда" hint={initial.length ? `${initial.length} чел. на сайте` : "Мастера, врачи, тренеры — если хотите их показать"}>
      <form
        className={s.form}
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ section: "team", team: list.filter((p) => p.name.trim()) }, ["team"]);
        }}
      >
        {list.map((p, i) => (
          <div key={i} className={s.row}>
            <input className="input" aria-label={`Имя ${i + 1}`} value={p.name} placeholder="Имя" onChange={(e) => setList((l) => l.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <input className="input" aria-label={`Роль ${i + 1}`} value={p.role} placeholder="Кто: «Старший мастер»" onChange={(e) => setList((l) => l.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))} />
            <button type="button" className={s.removeRow} aria-label={`Удалить ${i + 1}`} onClick={() => setList((l) => l.filter((_, j) => j !== i))}>
              ×
            </button>
          </div>
        ))}
        <p className={s.hint}>Фото команды добавим вместе с вашими фото перед публикацией.</p>
        <div className={s.formActions}>
          {list.length < 8 && (
            <button type="button" className="btn btn-secondary btn-small" onClick={() => setList((l) => [...l, { name: "", role: "" }])}>
              Добавить человека
            </button>
          )}
          <SaveButton busy={busy} action="team" disabled={list.length === 0 && initial.length === 0} />
        </div>
      </form>
    </Section>
  );
}

function ReviewsEditor({ initial, onSave, busy }: { initial: Custom["reviews"]; onSave: SaveEdit; busy: string | null }) {
  const [list, setList] = useState(initial);
  const valid = list.every((r) => !r.name.trim() || r.text.trim().length >= 10);
  return (
    <Section title="Отзывы" hint={initial.length ? `${initial.length} на сайте` : "Настоящие отзывы клиентов — например, из Яндекс Карт"}>
      <form
        className={s.form}
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ section: "reviews", reviews: list.filter((r) => r.name.trim()) }, ["reviews"]);
        }}
      >
        <p className={s.hint}>Добавляйте только настоящие отзывы. Придуманные вводят людей в заблуждение и могут нарушать закон о рекламе.</p>
        {list.map((r, i) => (
          <div key={i} className={s.reviewRow}>
            <div className={s.row}>
              <input className="input" aria-label={`Имя автора ${i + 1}`} value={r.name} placeholder="Имя" onChange={(e) => setList((l) => l.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <input className="input" aria-label={`Подпись ${i + 1}`} value={r.meta} placeholder="Например: «стрижка»" onChange={(e) => setList((l) => l.map((x, j) => (j === i ? { ...x, meta: e.target.value } : x)))} />
              <button type="button" className={s.removeRow} aria-label={`Удалить отзыв ${i + 1}`} onClick={() => setList((l) => l.filter((_, j) => j !== i))}>
                ×
              </button>
            </div>
            <textarea className={`input ${s.short}`} aria-label={`Текст отзыва ${i + 1}`} value={r.text} placeholder="Текст отзыва" maxLength={400} onChange={(e) => setList((l) => l.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
          </div>
        ))}
        <div className={s.formActions}>
          {list.length < 8 && (
            <button type="button" className="btn btn-secondary btn-small" onClick={() => setList((l) => [...l, { name: "", meta: "", text: "" }])}>
              Добавить отзыв
            </button>
          )}
          <SaveButton busy={busy} action="reviews" disabled={!valid || (list.length === 0 && initial.length === 0)} />
        </div>
      </form>
    </Section>
  );
}

function StatsEditor({ initial, onSave, busy }: { initial: Custom["stats"]; onSave: SaveEdit; busy: string | null }) {
  const [list, setList] = useState(initial);
  return (
    <Section title="Цифры о вас" hint={initial.length ? `${initial.length} на сайте` : "«8 лет», «2 000 клиентов» — то, чем вы гордитесь"}>
      <form
        className={s.form}
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ section: "stats", stats: list.filter((x) => x.value.trim() && x.label.trim()) }, []);
        }}
      >
        {list.map((x, i) => (
          <div key={i} className={s.row}>
            <input className={`input ${s.priceInput}`} aria-label={`Число ${i + 1}`} value={x.value} placeholder="8 лет" maxLength={12} onChange={(e) => setList((l) => l.map((y, j) => (j === i ? { ...y, value: e.target.value } : y)))} />
            <input className="input" aria-label={`Подпись ${i + 1}`} value={x.label} placeholder="работаем в городе" maxLength={40} onChange={(e) => setList((l) => l.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)))} />
            <button type="button" className={s.removeRow} aria-label={`Удалить цифру ${i + 1}`} onClick={() => setList((l) => l.filter((_, j) => j !== i))}>
              ×
            </button>
          </div>
        ))}
        <div className={s.formActions}>
          {list.length < 4 && (
            <button type="button" className="btn btn-secondary btn-small" onClick={() => setList((l) => [...l, { value: "", label: "" }])}>
              Добавить цифру
            </button>
          )}
          <SaveButton busy={busy} action="stats" disabled={list.length === 0 && initial.length === 0} />
        </div>
      </form>
    </Section>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}
