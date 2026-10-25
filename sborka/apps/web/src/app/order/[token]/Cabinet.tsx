"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BuildShowData, StyleInfo, TourStep } from "@/lib/sites/presentation";
import type { OrderStatus, Revision } from "@/lib/store";
// Гарнитуры тем — для образцов «Аа» в карточках вариантов и на экране сборки
import "@/sites/fonts";
import { BuildShow } from "./BuildShow";
import { Stage, type Device, type Spotlight } from "./Stage";
import { Tour } from "./Tour";
import s from "./cabinet.module.css";

interface Props {
  token: string;
  status: OrderStatus;
  businessName: string;
  versions: { n: number; createdAt: string; reason: "brief" | "variant"; style: StyleInfo }[];
  currentVersion: number;
  revisions: Revision[];
  variantsLeft: number;
  revisionsLeft: number;
  testPayments: boolean;
  tour: TourStep[];
  /** Данные для экрана сборки — только сразу после брифа. */
  show: BuildShowData | null;
}

const STATUS: Record<OrderStatus, string> = {
  ready: "Прототип готов",
  payment_pending: "Ждём оплату",
  paid: "Оплачено, публикуем",
  published: "Опубликовано",
};

/** Экскурсия начинается, когда сайт в окне доиграет своё интро. */
const TOUR_DELAY_MS = 2600;

export function Cabinet(p: Props) {
  const router = useRouter();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const revisionRef = useRef<HTMLTextAreaElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [device, setDevice] = useState<Device>("desktop");
  const [baseDevice, setBaseDevice] = useState<Device>("desktop");
  const [scale, setScale] = useState(1);
  const [spot, setSpot] = useState<Spotlight | null>(null);
  const [showing, setShowing] = useState(p.show !== null);
  const [touring, setTouring] = useState(false);
  const pendingTour = useRef(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState("");
  const [copied, setCopied] = useState(false);
  const editable = p.status === "ready" || p.status === "payment_pending";
  const current = p.versions.find((v) => v.n === p.currentVersion) ?? p.versions.at(-1)!;
  const previewUrl = `/preview/${p.token}?v=${p.currentVersion}`;

  // На телефоне десктопная вёрстка была бы слишком мелкой — начинаем с телефонной
  useEffect(() => {
    if (window.innerWidth < 760) {
      setDevice("phone");
      setBaseDevice("phone");
    }
  }, []);

  // На узком экране подпись идёт под сайтом — показываем их вместе
  useEffect(() => {
    if (touring && window.innerWidth <= 900) stageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [touring]);

  // Сменили вариант — экскурсия по старому сайту больше не нужна
  useEffect(() => {
    setTouring(false);
  }, [p.currentVersion]);

  const chooseDevice = (d: Device) => {
    setDevice(d);
    setBaseDevice(d);
  };

  const finishShow = useCallback(() => {
    setShowing(false);
    pendingTour.current = true;
    // Повторное открытие кабинета не должно запускать сборку снова
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const onFrameLoad = useCallback(() => {
    if (!pendingTour.current || !frameRef.current?.contentWindow?.location.pathname.startsWith("/preview/")) return;
    pendingTour.current = false;
    setTimeout(() => setTouring(true), TOUR_DELAY_MS);
  }, []);

  const closeTour = useCallback(() => setTouring(false), []);

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

  async function newVariant() {
    if (await call("variant", "variant")) router.refresh();
  }

  function askRevision() {
    setTouring(false);
    revisionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    revisionRef.current?.focus({ preventScroll: true });
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

  const finalActions = editable ? (
    <>
      <button type="button" className="btn btn-primary btn-small" onClick={pay} disabled={busy !== null}>
        {busy === "pay" ? "Переходим к оплате…" : "Оплатить 4 999 ₽"}
      </button>
      <button type="button" className="btn btn-secondary btn-small" onClick={newVariant} disabled={busy !== null || p.variantsLeft === 0}>
        {busy === "variant" ? "Собираем…" : "Другой вариант"}
      </button>
      <button type="button" className="btn btn-secondary btn-small" onClick={askRevision} disabled={p.revisionsLeft === 0}>
        Написать правки
      </button>
    </>
  ) : (
    <button type="button" className="btn btn-secondary btn-small" onClick={closeTour}>
      Закрыть
    </button>
  );

  return (
    <>
      <div className={s.layout}>
        <section className={s.main} aria-labelledby="preview-title">
          <div className={s.toolbar}>
            <div className={s.heading}>
              <p className={`${s.badge} ${editable ? "" : s.badgeDone}`}>{STATUS[p.status]}</p>
              <h1 id="preview-title" className={s.title}>
                {p.businessName}
              </h1>
              <p className={s.meta}>
                Вариант {current.n} · «{current.style.name}» · {current.style.layout}
              </p>
            </div>
            <div className={s.tools}>
              <button type="button" className={s.tourButton} onClick={() => setTouring((v) => !v)} aria-pressed={touring}>
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M3 1.8v10.4L12 7z" fill="currentColor" />
                </svg>
                Экскурсия по сайту
              </button>
              <div className={s.devices} role="group" aria-label="Размер экрана">
                <button type="button" aria-pressed={device === "desktop"} onClick={() => chooseDevice("desktop")}>
                  Компьютер
                </button>
                <button type="button" aria-pressed={device === "phone"} onClick={() => chooseDevice("phone")}>
                  Телефон
                </button>
              </div>
              <a href={previewUrl} target="_blank" className={s.open} aria-label="Открыть прототип в новой вкладке">
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M6 3H3v10h10v-3M9 2h5v5M14 2L7 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </a>
            </div>
          </div>

          <div ref={stageRef} className={s.stageWrap}>
            <Stage
              src={showing ? null : previewUrl}
              title={`Прототип сайта ${p.businessName}`}
              device={device}
              frameRef={frameRef}
              onLoad={onFrameLoad}
              onScale={setScale}
              spotlight={touring ? spot : null}
              compact={touring}
            />
            {touring && (
              <Tour
                steps={p.tour}
                frameRef={frameRef}
                scale={scale}
                baseDevice={baseDevice}
                setDevice={setDevice}
                onSpotlight={setSpot}
                onClose={closeTour}
                final={finalActions}
              />
            )}
          </div>
        </section>

        <aside className={s.panel}>
          {error && (
            <p className={s.error} role="alert">
              {error}
            </p>
          )}

          <section className={`${s.card} ${s.payCard}`} aria-labelledby="pay-title">
            {editable ? (
              <>
                <h2 id="pay-title" className={s.h2}>
                  Нравится?
                </h2>
                <p className={s.price}>4 999 ₽</p>
                <p className={s.text}>Оплатите, и мы опубликуем сайт на вашем домене в течение 24 часов.</p>
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
                <div className={s.variants} role="group" aria-label="Варианты сайта">
                  {p.versions.map((v) => (
                    <button
                      key={v.n}
                      type="button"
                      className={s.variant}
                      aria-pressed={v.n === p.currentVersion}
                      disabled={busy !== null}
                      onClick={async () => {
                        if (v.n !== p.currentVersion && (await call("version", "version", { n: v.n }))) router.refresh();
                      }}
                    >
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
                <button type="button" className="btn btn-secondary btn-small" disabled={busy !== null || p.variantsLeft === 0} onClick={newVariant}>
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
                      ref={revisionRef}
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

      {showing && p.show && <BuildShow data={p.show} onDone={finishShow} />}
    </>
  );
}
