"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { quote, rub, type AddonId, type AddonSelection, type Leads } from "@/lib/addons";
import type { BlockOption } from "@/lib/sites/catalog";
import type { Custom } from "@/lib/sites/customize";
import type { BuildShowData, TourStep } from "@/lib/sites/presentation";
import type { SiteStyle } from "@/lib/sites/style";
import type { EditMessage } from "@/sites/EditBridge";
import type { OrderStatus, Revision, Wish } from "@/lib/store";
// Гарнитуры тем — для образцов «Аа» в карточках вариантов и на экране сборки
import "@/sites/fonts";
import { AddTab } from "./AddTab";
import { BuildShow } from "./BuildShow";
import { EditorPanel, type EditorContext } from "./EditorPanel";
import { EditTab, type EditData, type SaveEdit } from "./EditTab";
import { OrderTab, type VersionCard } from "./OrderTab";
import { spotOf, Stage, type Device, type Spotlight } from "./Stage";
import { Tour } from "./Tour";
import { useOrderApi } from "./useOrderApi";
import s from "./cabinet.module.css";

interface Props {
  token: string;
  status: OrderStatus;
  businessName: string;
  versions: VersionCard[];
  currentVersion: number;
  /** Номер изменения заказа — меняется после каждой правки. */
  rev: number;
  revisions: Revision[];
  variantsLeft: number;
  revisionsLeft: number;
  testPayments: boolean;
  tour: TourStep[];
  /** Данные для экрана сборки — только сразу после брифа. */
  show: BuildShowData | null;
  addons: AddonSelection[];
  available: AddonId[];
  blocks: BlockOption[];
  edit: EditData;
  custom: Custom;
  leads: Leads;
  wishes: Wish[];
  /** Есть что отменить. */
  canUndo: boolean;
  /** Фото на выбор: загрузки клиента и библиотека сферы. */
  library: string[];
  uploads: string[];
  /** Оформление варианта без правок клиента — для «Как было». */
  defaults: { accent: string; font: string; layout: string };
}

const STATUS: Record<OrderStatus, string> = {
  ready: "Прототип готов",
  payment_pending: "Ждём оплату",
  paid: "Оплачено, публикуем",
  published: "Опубликовано",
};

type Tab = "order" | "edit" | "add" | "revisions";

/** Экскурсия начинается, когда сайт в окне доиграет своё интро. */
const TOUR_DELAY_MS = 2600;

export function Cabinet(p: Props) {
  const router = useRouter();
  const api = useOrderApi(p.token);
  const { busy, call } = api;
  const frameRef = useRef<HTMLIFrameElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const [device, setDevice] = useState<Device>("desktop");
  const [baseDevice, setBaseDevice] = useState<Device>("desktop");
  const [scale, setScale] = useState(1);
  const [spot, setSpot] = useState<Spotlight | null>(null);
  const [showing, setShowing] = useState(p.show !== null);
  const [touring, setTouring] = useState(false);
  const [tab, setTab] = useState<Tab>("order");
  const [addons, setAddons] = useState(p.addons);
  const [revision, setRevision] = useState("");
  const [saved, setSaved] = useState("");
  const [editing, setEditing] = useState(false);
  const [editorContext, setEditorContext] = useState<EditorContext>({
    kind: "design",
  });
  const pendingTour = useRef(false);
  /** Куда прокрутить сайт после перезагрузки окна. */
  const pendingAnchors = useRef<string[] | null>(null);
  /** Место прокрутки и блок, который подсветить после перезагрузки в редакторе. */
  const pendingScroll = useRef<number | null>(null);
  const pendingBlock = useRef<string | null>(null);
  /** Текст поправили прямо на сайте — окно с ним перезагружать не нужно. */
  const keepFrame = useRef(false);
  const [frameRev, setFrameRev] = useState(p.rev);
  const editable = p.status === "ready" || p.status === "payment_pending";
  const current = p.versions.find((v) => v.n === p.currentVersion) ?? p.versions.at(-1)!;

  // Заставка играет только при первом открытии; после правок сайт обновляется сразу
  const first = useRef({ v: p.currentVersion, rev: p.rev });
  const fresh = first.current.v === p.currentVersion && first.current.rev === frameRev && !editing;
  const previewUrl = `/preview/${p.token}?v=${p.currentVersion}${frameRev ? `&r=${frameRev}` : ""}${fresh ? "" : "&intro=0"}${editing ? "&edit=1" : ""}`;

  useEffect(() => {
    if (keepFrame.current) keepFrame.current = false;
    else setFrameRev(p.rev);
  }, [p.rev]);

  // Сервер вернул новый список дополнений — синхронизируемся
  useEffect(() => setAddons(p.addons), [p.addons]);

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

  // Экскурсия закончилась — возвращаем устройство, которое клиент выбрал сам
  useEffect(() => {
    if (!touring) setDevice(baseDevice);
  }, [touring, baseDevice]);

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

  /** Прокрутить сайт к первому найденному блоку и ненадолго обвести его. */
  const showOnSite = useCallback(
    (anchors: string[]) => {
      const win = frameRef.current?.contentWindow;
      const doc = frameRef.current?.contentDocument;
      if (!win || !doc) return;
      setTouring(false);
      if (window.innerWidth <= 900)
        stageRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      const el = anchors.map((id) => doc.getElementById(id)).find(Boolean) ?? null;
      win.scrollTo({
        top: el ? el.getBoundingClientRect().top + win.scrollY - 24 : 0,
        behavior: "smooth",
      });
      if (!el) return;
      setTimeout(() => setSpot(spotOf(win, el, scale)), 900);
      setTimeout(() => setSpot(null), 3200);
    },
    [scale],
  );

  const onFrameLoad = useCallback(() => {
    const win = frameRef.current?.contentWindow;
    if (!win?.location.pathname.startsWith("/preview/")) return;
    if (pendingScroll.current !== null) {
      const y = pendingScroll.current;
      const ek = pendingBlock.current;
      pendingScroll.current = null;
      pendingBlock.current = null;
      setTimeout(() => {
        win.scrollTo(0, y);
        const el = ek ? win.document.querySelector(`[data-ek="${ek}"]`)?.firstElementChild : null;
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (r.top < 0 || r.top > win.innerHeight * 0.6) win.scrollTo({ top: r.top + win.scrollY - 80, behavior: "smooth" });
        setTimeout(() => setSpot(spotOf(win, el, scale)), 500);
        setTimeout(() => setSpot(null), 2200);
      }, 80);
    }
    if (pendingAnchors.current) {
      const anchors = pendingAnchors.current;
      pendingAnchors.current = null;
      setTimeout(() => showOnSite(anchors), 300);
    }
    if (pendingTour.current) {
      pendingTour.current = false;
      setTimeout(() => setTouring(true), TOUR_DELAY_MS);
    }
  }, [showOnSite, scale]);

  const closeTour = useCallback(() => setTouring(false), []);

  /** Перезагрузить данные кабинета; окно с сайтом обновится и покажет изменение. */
  const refresh = useCallback(
    (anchors: string[] | null) => {
      pendingAnchors.current = anchors;
      router.refresh();
    },
    [router],
  );

  const saveEdit: SaveEdit = useCallback(
    async (body, anchors) => {
      const ok = await call(String(body.section), "edit", body);
      if (!ok) return false;
      setSaved("Сохранено — сайт обновлён");
      setTimeout(() => setSaved(""), 2500);
      refresh(anchors);
      return true;
    },
    [call, refresh],
  );

  /** Перезагрузить сайт в редакторе, не теряя место прокрутки; block — что подсветить. */
  const reloadKeeping = useCallback(
    (block?: string, top?: number) => {
      pendingScroll.current = top ?? frameRef.current?.contentWindow?.scrollY ?? 0;
      pendingBlock.current = block ?? null;
      router.refresh();
    },
    [router],
  );

  const flash = useCallback((text: string) => {
    setSaved(text);
    setTimeout(() => setSaved(""), 2200);
  }, []);

  const editOnSite = useCallback(
    async (body: Record<string, unknown>, opts: { block?: string; top?: number; keep?: boolean } = {}) => {
      if (opts.keep) keepFrame.current = true;
      const ok = await call(String(body.section), "edit", body);
      if (!ok) {
        keepFrame.current = false;
        reloadKeeping();
        return false;
      }
      flash("Сохранено");
      if (opts.keep) router.refresh();
      else reloadKeeping(opts.block, opts.top);
      return true;
    },
    [call, flash, reloadKeeping, router],
  );

  // Сообщения из окна с сайтом в режиме редактирования
  useEffect(() => {
    if (!editing) return;
    const onMessage = (ev: MessageEvent) => {
      if (ev.origin !== window.location.origin || ev.source !== frameRef.current?.contentWindow) return;
      const msg = ev.data as EditMessage & { source?: string };
      if (msg?.source !== "sborka-edit") return;
      if (msg.type === "text") editOnSite({ section: "text", path: msg.path, value: msg.value }, { keep: msg.value !== "" });
      if (msg.type === "image") {
        setEditorContext({ kind: "photo", path: msg.path, src: msg.src });
        panelRef.current?.scrollTo({ top: 0 });
        if (window.innerWidth <= 1100)
          panelRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }
      if (msg.type === "service") {
        setEditorContext({ kind: "service", name: msg.name });
        panelRef.current?.scrollTo({ top: 0 });
        if (window.innerWidth <= 1100)
          panelRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }
      if (msg.type === "move") editOnSite({ section: "move", key: msg.key, dir: msg.dir }, { block: msg.key });
      if (msg.type === "hide") editOnSite({ section: "hide", key: msg.key });
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [editing, editOnSite]);

  function toggleEditing(on: boolean) {
    pendingScroll.current = frameRef.current?.contentWindow?.scrollY ?? 0;
    setTouring(false);
    setEditorContext({ kind: "design" });
    setEditing(on);
  }

  async function upload(file: File): Promise<string | null> {
    const form = new FormData();
    form.append("file", file);
    api.setError("");
    try {
      const res = await fetch(`/api/orders/${p.token}/upload`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Не получилось загрузить фото");
      return data.url as string;
    } catch (err) {
      api.setError(err instanceof Error ? err.message : "Не получилось загрузить фото");
      return null;
    }
  }

  async function undo() {
    if (await call("undo", "undo")) {
      flash("Отменено");
      reloadKeeping();
    }
  }

  async function changeAddons(next: AddonSelection[], anchors: string[]) {
    const before = addons;
    setAddons(next);
    if (await call("addons", "addons", { addons: next })) refresh(anchors.length ? anchors : null);
    else setAddons(before);
  }

  async function pay() {
    const data = await call<{ confirmationUrl?: string }>("pay", "pay");
    if (data?.confirmationUrl) window.location.href = data.confirmationUrl;
  }

  async function newVariant() {
    if (await call("variant", "variant")) refresh(null);
  }

  async function chooseVersion(n: number) {
    if (await call("version", "version", { n })) refresh(null);
  }

  function openTab(next: Tab) {
    setTab(next);
    // Новая вкладка открывается с начала, а не с места, где листали прошлую
    panelRef.current?.scrollTo({ top: 0 });
    if (window.innerWidth <= 1100) panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function sendRevision(e: React.FormEvent) {
    e.preventDefault();
    if (await call("revision", "revision", { text: revision })) {
      setRevision("");
      router.refresh();
    }
  }

  const total = quote(addons).total;
  const finalActions = editable ? (
    <>
      <button type="button" className="btn btn-primary btn-small" onClick={pay} disabled={busy !== null}>
        {busy === "pay" ? "Переходим к оплате…" : `Оплатить ${rub(total)}`}
      </button>
      <button
        type="button"
        className="btn btn-secondary btn-small"
        onClick={() => {
          setTouring(false);
          openTab("add");
        }}
      >
        Что ещё добавить
      </button>
      <button
        type="button"
        className="btn btn-secondary btn-small"
        onClick={() => {
          setTouring(false);
          openTab("edit");
        }}
      >
        Изменить
      </button>
    </>
  ) : (
    <button type="button" className="btn btn-secondary btn-small" onClick={closeTour}>
      Закрыть
    </button>
  );

  const tabs: { id: Tab; title: string; count?: number }[] = editable
    ? [
        { id: "order", title: "Заказ" },
        { id: "edit", title: "Изменить" },
        { id: "add", title: "Добавить", count: addons.length || undefined },
        {
          id: "revisions",
          title: "Правки",
          count: p.revisions.length || undefined,
        },
      ]
    : [{ id: "order", title: "Заказ" }];

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
              {editable && (
                <button type="button" className={s.editButton} onClick={() => toggleEditing(!editing)} aria-pressed={editing}>
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                    <path d="M9.5 1.5l3 3L5 12H2v-3z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                  {editing ? "Закончить правку" : "Редактировать на сайте"}
                </button>
              )}
              <button
                type="button"
                className={s.tourButton}
                onClick={() => {
                  if (editing) toggleEditing(false);
                  setTouring((v) => !v);
                }}
                aria-pressed={touring}
              >
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
              <a href={previewUrl.replace("&intro=0", "")} target="_blank" className={s.open} aria-label="Открыть прототип в новой вкладке">
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
              spotlight={spot}
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
            {editing && <p className={s.editHint}>Нажмите на текст, фото или наведите на блок</p>}
            <p className={s.saved} aria-live="polite" data-show={saved || undefined}>
              {saved}
            </p>
          </div>
        </section>

        <aside ref={panelRef} className={s.panel} aria-label="Управление заказом">
          {editing && (
            <>
              {api.error && (
                <p className={s.error} role="alert">
                  {api.error}
                </p>
              )}
              <EditorPanel
                context={editorContext}
                setContext={setEditorContext}
                style={p.custom.style}
                defaults={p.defaults}
                library={p.library}
                uploads={p.uploads}
                services={p.edit.services}
                canUndo={p.canUndo}
                busy={busy}
                onStyle={(style: SiteStyle) =>
                  editOnSite({ section: "style", style }, style.hero !== p.custom.style.hero ? { top: 0 } : {})
                }
                onPhoto={async (path, src) => {
                  if (await editOnSite({ section: "image", path, src })) setEditorContext({ kind: "photo", path, src });
                }}
                onUpload={upload}
                onUndo={undo}
                onDone={() => toggleEditing(false)}
                onSave={async (body) => {
                  const ok = await editOnSite(body);
                  if (ok) setEditorContext({ kind: "design" });
                  return ok;
                }}
              />
            </>
          )}
          {!editing && tabs.length > 1 && (
            <div className={s.tabs} role="tablist" aria-label="Разделы кабинета">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`tab-${t.id}`}
                  aria-selected={tab === t.id}
                  aria-controls={`panel-${t.id}`}
                  onClick={() => {
                    setTab(t.id);
                    panelRef.current?.scrollTo({ top: 0 });
                  }}
                >
                  {t.title}
                  {t.count && <i>{t.count}</i>}
                </button>
              ))}
            </div>
          )}

          {!editing && api.error && (
            <p className={s.error} role="alert">
              {api.error}
            </p>
          )}

          {!editing && (
            <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={tabs.length > 1 ? `tab-${tab}` : undefined} className={s.tabPanel}>
              {tab === "order" && (
                <OrderTab
                  editable={editable}
                  paidText={
                    p.status === "published"
                      ? {
                          title: "Сайт опубликован",
                          text: "Сайт работает на вашем домене.",
                        }
                      : {
                          title: "Оплата получена",
                          text: "Публикуем сайт в течение 24 часов и напишем вам, когда всё будет готово.",
                        }
                  }
                  addons={addons}
                  onRemove={(id) =>
                    changeAddons(
                      addons.filter((a) => a.id !== id),
                      [],
                    )
                  }
                  onPay={pay}
                  busy={busy}
                  testPayments={p.testPayments}
                  versions={p.versions}
                  currentVersion={p.currentVersion}
                  onVersion={chooseVersion}
                  variantsLeft={p.variantsLeft}
                  onVariant={newVariant}
                />
              )}
              {tab === "edit" && <EditTab data={p.edit} custom={p.custom} blocks={p.blocks} onSave={saveEdit} busy={busy} />}
              {tab === "add" && (
                <AddTab
                  available={p.available}
                  addons={addons}
                  onAddons={changeAddons}
                  onShow={showOnSite}
                  leads={p.leads}
                  wishes={p.wishes}
                  api={api}
                  onChanged={() => router.refresh()}
                />
              )}
              {tab === "revisions" && (
                <section className={s.card} aria-labelledby="revisions-title">
                  <h2 id="revisions-title" className={s.h2}>
                    Правки дизайнеру
                  </h2>
                  <p className={s.text}>
                    Для всего, что не получается поменять во вкладке «Изменить»: другой цвет, другой порядок блоков, своя идея.
                  </p>
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
                        placeholder="Например: сделайте фон темнее и поменяйте местами галерею и отзывы"
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
              )}
            </div>
          )}
        </aside>
      </div>

      {showing && p.show && <BuildShow data={p.show} onDone={finishShow} />}
    </>
  );
}
