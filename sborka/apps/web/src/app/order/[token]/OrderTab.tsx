"use client";

import { useState } from "react";
import { INCLUDED, quote, rub, type AddonSelection } from "@/lib/addons";
import type { StyleInfo } from "@/lib/sites/presentation";
import s from "./cabinet.module.css";

export interface VersionCard {
  n: number;
  style: StyleInfo;
}

/** Вкладка «Заказ»: итог с позициями и оплатой, варианты, ссылка на кабинет. */
export function OrderTab({
  editable,
  paidText,
  addons,
  onRemove,
  onPay,
  busy,
  testPayments,
  versions,
  currentVersion,
  onVersion,
  variantsLeft,
  onVariant,
}: {
  editable: boolean;
  paidText: { title: string; text: string };
  addons: AddonSelection[];
  onRemove: (id: AddonSelection["id"]) => void;
  onPay: () => void;
  busy: string | null;
  testPayments: boolean;
  versions: VersionCard[];
  currentVersion: number;
  onVersion: (n: number) => void;
  variantsLeft: number;
  onVariant: () => void;
}) {
  const q = quote(addons);
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href.split("?")[0]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <section className={`${s.card} ${s.payCard}`} aria-labelledby="pay-title">
        {editable ? (
          <>
            <h2 id="pay-title" className={s.h2}>
              Ваш заказ
            </h2>
            <ul className={s.lines}>
              {q.lines.map((l) => (
                <li key={l.id}>
                  <span>{l.title}</span>
                  <b>{rub(l.amount)}</b>
                  {l.id !== "site" && (
                    <button type="button" className={s.removeLine} onClick={() => onRemove(l.id as AddonSelection["id"])} disabled={busy !== null} aria-label={`Убрать: ${l.title}`}>
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <p className={s.totalRow}>
              <span>Итого</span>
              <b className={s.price}>{rub(q.total)}</b>
            </p>
            {(q.monthly.length > 0 || q.separate.length > 0) && (
              <ul className={s.later}>
                {q.monthly.map((m) => (
                  <li key={m.id}>
                    {m.title}: {rub(m.amount)}/мес со 2-го месяца
                  </li>
                ))}
                {q.separate.map((m) => (
                  <li key={m.id}>
                    {m.title}: отдельный заказ, от {rub(m.amount)}. Обсудим после запуска сайта.
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className="btn btn-primary" onClick={onPay} disabled={busy !== null}>
              {busy === "pay" ? "Переходим к оплате…" : `Оплатить ${rub(q.total)}`}
            </button>
            <p className={s.hint}>
              Оплачиваете, только если сайт нравится. После оплаты опубликуем его в течение 24 часов.
              {testPayments && " Сейчас тестовый режим: деньги не списываются."}
            </p>
          </>
        ) : (
          <>
            <h2 id="pay-title" className={s.h2}>
              {paidText.title}
            </h2>
            <p className={s.text}>{paidText.text}</p>
          </>
        )}
      </section>

      {editable && (
        <details className={s.card}>
          <summary className={s.summary}>Что входит в {rub(q.lines[0].amount)}</summary>
          <ul className={s.included}>
            {INCLUDED.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </details>
      )}

      {editable && (
        <section className={s.card} aria-labelledby="variants-title">
          <h2 id="variants-title" className={s.h2}>
            Варианты
          </h2>
          <div className={s.variants} role="group" aria-label="Варианты сайта">
            {versions.map((v) => (
              <button key={v.n} type="button" className={s.variant} aria-pressed={v.n === currentVersion} disabled={busy !== null} onClick={() => v.n !== currentVersion && onVersion(v.n)}>
                <span className={s.swatch} style={{ background: v.style.colors.bg, color: v.style.colors.text }} aria-hidden="true">
                  <em style={{ fontFamily: v.style.display, fontWeight: v.style.displayWeight }}>Аа</em>
                  <i style={{ background: v.style.colors.accent }} />
                </span>
                <span className={s.variantText}>
                  <b>Вариант {v.n}</b>
                  <small>
                    «{v.style.name}» · {v.style.layout} · {v.style.font}
                  </small>
                </span>
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-secondary btn-small" disabled={busy !== null || variantsLeft === 0} onClick={onVariant}>
            {busy === "variant" ? "Собираем…" : "Собрать другой вариант"}
          </button>
          <p className={s.hint}>
            {variantsLeft > 0 ? `Бесплатно осталось: ${variantsLeft}. Ваши правки сохранятся в любом варианте.` : "Бесплатные варианты закончились"}
          </p>
        </section>
      )}

      <section className={s.card} aria-labelledby="link-title">
        <h2 id="link-title" className={s.h2}>
          Ссылка на кабинет
        </h2>
        <p className={s.text}>Сохраните её — по ней вы вернётесь к своему сайту.</p>
        <button type="button" className="btn btn-secondary btn-small" onClick={copyLink}>
          {copied ? "Ссылка скопирована" : "Скопировать ссылку"}
        </button>
      </section>
    </>
  );
}
