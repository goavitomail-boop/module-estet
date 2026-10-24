"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { OrderStatus, Revision } from "@/lib/store";
import s from "./cabinet.module.css";

interface Props {
  token: string;
  status: OrderStatus;
  businessName: string;
  versions: { n: number; createdAt: string; reason: "brief" | "variant" }[];
  currentVersion: number;
  revisions: Revision[];
  variantsLeft: number;
  revisionsLeft: number;
  testPayments: boolean;
}

const STATUS: Record<OrderStatus, string> = {
  ready: "Прототип готов",
  payment_pending: "Ждём оплату",
  paid: "Оплачено, публикуем",
  published: "Опубликовано",
};

export function Cabinet(p: Props) {
  const router = useRouter();
  const [device, setDevice] = useState<"desktop" | "phone">("desktop");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState("");
  const [copied, setCopied] = useState(false);
  const editable = p.status === "ready" || p.status === "payment_pending";

  async function call(action: string, path: string, body?: unknown) {
    setBusy(action);
    setError("");
    try {
      const res = await fetch(`/api/orders/${p.token}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Не получилось выполнить действие");
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не получилось выполнить действие");
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function pay() {
    const data = await call("pay", "pay");
    if (data?.confirmationUrl) window.location.href = data.confirmationUrl;
  }

  async function sendRevision(e: React.FormEvent) {
    e.preventDefault();
    const data = await call("revision", "revision", { text: revision });
    if (data) {
      setRevision("");
      router.refresh();
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={s.layout}>
      <section className={s.previewCol} aria-labelledby="preview-title">
        <div className={s.toolbar}>
          <div>
            <p className={`${s.badge} ${editable ? "" : s.badgeDone}`}>{STATUS[p.status]}</p>
            <h1 id="preview-title" className={s.title}>
              {p.businessName}
            </h1>
          </div>
          <div className={s.devices} role="group" aria-label="Размер экрана">
            <button type="button" aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}>
              Компьютер
            </button>
            <button type="button" aria-pressed={device === "phone"} onClick={() => setDevice("phone")}>
              Телефон
            </button>
          </div>
        </div>
        <div className={s.stage} data-device={device}>
          <iframe
            key={p.currentVersion}
            title={`Прототип сайта ${p.businessName}`}
            src={`/preview/${p.token}?v=${p.currentVersion}`}
            className={s.iframe}
          />
        </div>
        <p className={s.openFull}>
          <a href={`/preview/${p.token}?v=${p.currentVersion}`} target="_blank" className="link">
            Открыть прототип в новой вкладке
          </a>
        </p>
      </section>

      <aside className={s.panel}>
        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}

        <section className={s.card} aria-labelledby="pay-title">
          {editable ? (
            <>
              <h2 id="pay-title" className={s.h2}>
                Нравится?
              </h2>
              <p className={s.text}>Оплатите 4 999 ₽, и мы опубликуем сайт на вашем домене в течение 24 часов.</p>
              <button type="button" className="btn btn-primary" onClick={pay} disabled={busy !== null}>
                {busy === "pay" ? "Переходим к оплате…" : "Оплатить 4 999 ₽"}
              </button>
              {p.testPayments && <p className={s.hint}>Тестовый режим: деньги не списываются.</p>}
            </>
          ) : (
            <>
              <h2 id="pay-title" className={s.h2}>
                {p.status === "published" ? "Сайт опубликован" : "Оплата получена"}
              </h2>
              <p className={s.text}>
                {p.status === "published"
                  ? "Сайт работает на вашем домене."
                  : "Публикуем сайт в течение 24 часов и напишем вам, когда всё будет готово."}
              </p>
            </>
          )}
        </section>

        {editable && (
          <>
            <section className={s.card} aria-labelledby="variants-title">
              <h2 id="variants-title" className={s.h2}>
                Варианты
              </h2>
              <div className={s.versions} role="group" aria-label="Версии сайта">
                {p.versions.map((v) => (
                  <button
                    key={v.n}
                    type="button"
                    aria-pressed={v.n === p.currentVersion}
                    disabled={busy !== null}
                    onClick={async () => {
                      if (await call("version", "version", { n: v.n })) router.refresh();
                    }}
                  >
                    Вариант {v.n}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                disabled={busy !== null || p.variantsLeft === 0}
                onClick={async () => {
                  if (await call("variant", "variant")) router.refresh();
                }}
              >
                {busy === "variant" ? "Собираем…" : "Собрать другой вариант"}
              </button>
              <p className={s.hint}>
                {p.variantsLeft > 0 ? `Бесплатно осталось: ${p.variantsLeft}` : "Бесплатные варианты закончились"}
              </p>
            </section>

            <section className={s.card} aria-labelledby="revisions-title">
              <h2 id="revisions-title" className={s.h2}>
                Правки
              </h2>
              {p.revisions.length > 0 && (
                <ul className={s.revisions}>
                  {p.revisions.map((r) => (
                    <li key={r.id}>
                      <p>{r.text}</p>
                      <span>{r.status === "done" ? "Внесена" : "Передана дизайнеру"}</span>
                    </li>
                  ))}
                </ul>
              )}
              {p.revisionsLeft > 0 ? (
                <form onSubmit={sendRevision} className={s.revisionForm}>
                  <label className="field-label" htmlFor="revision">
                    Что изменить?
                  </label>
                  <textarea
                    id="revision"
                    className="input"
                    value={revision}
                    onChange={(e) => setRevision(e.target.value)}
                    placeholder="Например: сделайте фон темнее и добавьте услугу «Дизайн ногтей»"
                    maxLength={1000}
                  />
                  <button type="submit" className="btn btn-secondary btn-small" disabled={busy !== null || revision.trim().length < 3}>
                    {busy === "revision" ? "Отправляем…" : "Отправить правку"}
                  </button>
                  <p className={s.hint}>Бесплатно осталось: {p.revisionsLeft} из 3</p>
                </form>
              ) : (
                <p className={s.hint}>Бесплатные правки закончились.</p>
              )}
            </section>
          </>
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
      </aside>
    </div>
  );
}
