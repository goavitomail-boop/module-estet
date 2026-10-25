"use client";

import { useEffect } from "react";

/**
 * Режим редактирования прототипа в кабинете. Работает внутри окна с сайтом:
 * подсвечивает то, что можно поменять, даёт править текст прямо на месте,
 * а о фото, услугах, блоках и эффектах сообщает кабинету — там открываются нужные настройки.
 *
 * Разметка в рендерере: data-ek — ключ блока, data-efx — группа эффектов блока, data-ef — поле текста
 * (относительно блока, «/» в начале — от корня сайта), data-ei — фото, data-svc — услуга из списка.
 */

export type EditMessage =
  | { type: "text"; path: string; value: string }
  | { type: "image"; path: string; src: string }
  | { type: "service"; name: string }
  | { type: "move"; key: string; dir: "up" | "down" }
  | { type: "hide"; key: string }
  | { type: "effects"; key: string; group: string }
  | { type: "ready" };

const CSS = `
html[data-editing] [data-ef], html[data-editing] [data-svc] { cursor: text; }
html[data-editing] [data-ei] { cursor: pointer; }
html[data-editing] [data-r] { opacity: 1 !important; }
html[data-editing] [contenteditable] { outline: 2px solid #c8ff3d !important; outline-offset: 4px; border-radius: 4px; background: rgba(200,255,61,.08); cursor: text; }
html[data-editing] [contenteditable]:focus { box-shadow: 0 0 0 8px rgba(200,255,61,.18); }
.eb-box { position: fixed; z-index: 2147483000; pointer-events: none; border: 2px dashed #c8ff3d; border-radius: 6px; transition: all .12s ease-out; display: none; }
.eb-chip { position: fixed; z-index: 2147483001; pointer-events: none; padding: 4px 10px; border-radius: 999px; background: #c8ff3d; color: #0a0a0d; font: 600 12px/1.3 system-ui, sans-serif; white-space: nowrap; display: none; box-shadow: 0 6px 20px rgba(0,0,0,.25); }
.eb-bar { position: fixed; z-index: 2147483002; display: none; align-items: center; gap: 4px; padding: 4px; border-radius: 999px; background: #0e100d; color: #f2f2ee; font: 600 12px/1 system-ui, sans-serif; box-shadow: 0 10px 30px rgba(0,0,0,.35); border: 1px solid rgba(200,255,61,.45); }
.eb-bar span { padding: 0 8px; color: #c8ff3d; }
.eb-bar button { min-width: 30px; height: 30px; padding: 0 10px; border: 0; border-radius: 999px; background: rgba(255,255,255,.08); color: inherit; font: inherit; cursor: pointer; }
.eb-bar button:hover:not(:disabled) { background: #c8ff3d; color: #0a0a0d; }
.eb-bar button:disabled { opacity: .3; cursor: not-allowed; }
.eb-bar button[data-act="fx"] { background: rgba(200,255,61,.16); color: #c8ff3d; }
`;

const CHIP = {
  text: "Текст · нажмите, чтобы изменить",
  image: "Фото · нажмите, чтобы заменить",
  service: "Услуга · изменить в списке услуг",
};

type Target = { kind: "text" | "image" | "service"; el: HTMLElement; path?: string; name?: string };

function absPath(rel: string, el: Element) {
  if (rel.startsWith("/")) return rel.slice(1);
  const ek = el.closest("[data-ek]")?.getAttribute("data-ek");
  return ek ? `${ek}.${rel}` : null;
}

function findTarget(node: EventTarget | null): Target | null {
  if (!(node instanceof Element)) return null;
  const svc = node.closest<HTMLElement>("[data-svc]");
  if (svc) return { kind: "service", el: svc, name: svc.dataset.svc };
  const ef = node.closest<HTMLElement>("[data-ef]");
  if (ef) {
    const path = absPath(ef.dataset.ef!, ef);
    if (path) return { kind: "text", el: ef, path };
  }
  const ei = node.closest<HTMLElement>("[data-ei]");
  if (ei) {
    const path = absPath(ei.dataset.ei!, ei);
    if (path) return { kind: "image", el: ei, path };
  }
  return null;
}

/**
 * Текст элемента как он записан, а не как показан: innerText вернул бы
 * заглавные буквы там, где заголовки оформлены капслоком.
 */
function plain(el: HTMLElement) {
  el.querySelectorAll("br").forEach((br) => br.replaceWith(" "));
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}

/** У обёртки блока нет своей рамки (display: contents) — берём рамку секции внутри. */
function blockRect(wrap: Element) {
  const first = wrap.firstElementChild;
  return first ? first.getBoundingClientRect() : null;
}

export function EditBridge() {
  useEffect(() => {
    const doc = document;
    const html = doc.documentElement;
    html.setAttribute("data-editing", "");
    const style = doc.createElement("style");
    style.textContent = CSS;
    doc.head.appendChild(style);
    const box = doc.createElement("div");
    box.className = "eb-box";
    const chip = doc.createElement("div");
    chip.className = "eb-chip";
    const bar = doc.createElement("div");
    bar.className = "eb-bar";
    bar.innerHTML = `<span></span><button type="button" data-act="up" aria-label="Выше">↑</button><button type="button" data-act="down" aria-label="Ниже">↓</button><button type="button" data-act="fx">✦ Эффект</button><button type="button" data-act="hide"></button>`;
    doc.body.append(box, chip, bar);

    const post = (msg: EditMessage) => window.parent.postMessage({ source: "sborka-edit", ...msg }, location.origin);
    // Всё видно сразу: в редакторе не ждём анимаций появления
    doc.querySelectorAll("[data-r]").forEach((el) => el.setAttribute("data-in", ""));

    let editing: { el: HTMLElement; path: string; html: string; text: string } | null = null;
    let hoverBlock: HTMLElement | null = null;
    let raf = 0;
    let lastEvent: MouseEvent | null = null;

    const hideHover = () => {
      box.style.display = "none";
      chip.style.display = "none";
    };

    const placeBar = () => {
      if (!hoverBlock) return;
      const r = blockRect(hoverBlock);
      if (!r || r.bottom < 40 || r.top > innerHeight - 40) {
        bar.style.display = "none";
        return;
      }
      const blocks = Array.from(doc.querySelectorAll<HTMLElement>("[data-ek]")).filter((b) => b.dataset.ek !== "hero" && b.dataset.ek !== "contacts");
      const i = blocks.indexOf(hoverBlock);
      const label = bar.querySelector("span")!;
      label.textContent = hoverBlock.dataset.el ?? "";
      const [up, down, fx, hide] = Array.from(bar.querySelectorAll("button"));
      // Первый экран не двигается и не скрывается — у него только эффект
      const hero = hoverBlock.dataset.ek === "hero";
      up.style.display = down.style.display = hero ? "none" : "";
      up.disabled = i <= 0;
      down.disabled = i === -1 || i >= blocks.length - 1;
      fx.style.display = hoverBlock.dataset.efx ? "" : "none";
      const eh = hoverBlock.dataset.eh ?? "";
      hide.style.display = eh ? "" : "none";
      hide.textContent = eh.startsWith("addon:") ? `Убрать · −${eh.slice(6)} ₽` : "Скрыть";
      bar.style.display = "flex";
      // У первого экрана сверху шапка сайта — панель ставим внизу
      bar.style.top = hero ? `${Math.max(12, Math.min(innerHeight, r.bottom) - bar.offsetHeight - 16)}px` : `${Math.max(12, r.top + 12)}px`;
      bar.style.left = `${Math.min(innerWidth - bar.offsetWidth - 12, r.right - bar.offsetWidth - 12)}px`;
    };

    const update = () => {
      raf = 0;
      const e = lastEvent;
      if (!e) return;
      const wrap = (e.target as Element | null)?.closest<HTMLElement>("[data-ek]") ?? null;
      const ek = wrap?.dataset.ek;
      const withBar = wrap && ek !== "contacts" && (ek !== "hero" || wrap.dataset.efx) ? wrap : null;
      if (!bar.contains(e.target as Node)) {
        hoverBlock = withBar;
        if (!withBar) bar.style.display = "none";
        placeBar();
      }
      const t = editing ? null : findTarget(e.target);
      if (!t) return hideHover();
      const r = t.el.getBoundingClientRect();
      Object.assign(box.style, { display: "block", top: `${r.top - 4}px`, left: `${r.left - 4}px`, width: `${r.width + 8}px`, height: `${r.height + 8}px` });
      chip.textContent = CHIP[t.kind];
      chip.style.display = "block";
      chip.style.top = `${r.top - 30 < 4 ? r.bottom + 8 : r.top - 30}px`;
      chip.style.left = `${Math.max(4, Math.min(innerWidth - chip.offsetWidth - 4, r.left))}px`;
    };

    const onMove = (e: MouseEvent) => {
      lastEvent = e;
      if (!raf) raf = requestAnimationFrame(update);
    };
    const onScroll = () => {
      hideHover();
      placeBar();
    };

    const finish = (save: boolean) => {
      if (!editing) return;
      const { el, path, html: before, text } = editing;
      editing = null;
      el.removeAttribute("contenteditable");
      const value = plain(el);
      if (!save || value === text) {
        el.innerHTML = before;
        return;
      }
      post({ type: "text", path, value });
    };

    const startEdit = (el: HTMLElement, path: string) => {
      finish(true);
      editing = { el, path, html: el.innerHTML, text: plain(el) };
      // Слова для анимации разложены по span — для правки нужен обычный текст
      el.textContent = editing.text;
      el.setAttribute("contenteditable", "plaintext-only");
      if (el.contentEditable !== "plaintext-only") el.setAttribute("contenteditable", "true");
      el.focus();
      const range = doc.createRange();
      range.selectNodeContents(el);
      const sel = getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      hideHover();
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (bar.contains(target)) {
        const act = target.closest<HTMLButtonElement>("button")?.dataset.act;
        const key = hoverBlock?.dataset.ek;
        if (act && key) {
          if (act === "fx") post({ type: "effects", key, group: hoverBlock?.dataset.efx ?? "" });
          else if (act === "hide") post({ type: "hide", key });
          else post({ type: "move", key, dir: act as "up" | "down" });
        }
        return;
      }
      if (editing && editing.el.contains(target)) return;
      const t = findTarget(target);
      // В редакторе ссылки, кнопки записи и просмотр фото не срабатывают
      if (t || target.closest("a, [data-open], [data-full]")) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (!t) return finish(true);
      if (t.kind === "text" && t.path) startEdit(t.el, t.path);
      else {
        finish(true);
        if (t.kind === "image" && t.path) {
          const src = t.el instanceof HTMLImageElement ? new URL(t.el.src).pathname : "";
          post({ type: "image", path: t.path, src });
        }
        if (t.kind === "service" && t.name) post({ type: "service", name: t.name });
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (!editing) return;
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        finish(true);
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        finish(false);
      }
    };
    const onFocusOut = (e: FocusEvent) => {
      if (editing && e.target === editing.el) finish(true);
    };

    doc.addEventListener("mousemove", onMove, { passive: true });
    doc.addEventListener("click", onClick, true);
    doc.addEventListener("keydown", onKey, true);
    doc.addEventListener("focusout", onFocusOut);
    addEventListener("scroll", onScroll, { passive: true });
    doc.addEventListener("mouseleave", hideHover);
    post({ type: "ready" });

    return () => {
      cancelAnimationFrame(raf);
      doc.removeEventListener("mousemove", onMove);
      doc.removeEventListener("click", onClick, true);
      doc.removeEventListener("keydown", onKey, true);
      doc.removeEventListener("focusout", onFocusOut);
      removeEventListener("scroll", onScroll);
      doc.removeEventListener("mouseleave", hideHover);
      box.remove();
      chip.remove();
      bar.remove();
      style.remove();
      html.removeAttribute("data-editing");
    };
  }, []);

  return null;
}
