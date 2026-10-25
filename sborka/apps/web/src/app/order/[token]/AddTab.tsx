"use client";

import { useState } from "react";
import { AddonChoice, Choice, toggleAddon } from "@/components/order/Choice";
import { ADDON_GROUPS, ADDONS, FEATURE_ADDONS, LEAD_CHANNELS, LEAD_LABEL, type AddonId, type AddonSelection, type Leads } from "@/lib/addons";
import type { Wish } from "@/lib/store";
import type { OrderApi } from "./useOrderApi";
import s from "./cabinet.module.css";

/** Где на сайте искать блок фишки: у добавленной свой якорь, у единственной — общий. */
export function featureAnchors(id: AddonId) {
  const kind = FEATURE_ADDONS[id as keyof typeof FEATURE_ADDONS];
  return kind ? [`feature-${kind}`, "feature"] : [];
}

/**
 * Вкладка «Добавить»: дополнения с ценой и объяснением, куда присылать заявки
 * и запрос «не нашли нужное».
 */
export function AddTab({
  available,
  addons,
  onAddons,
  onShow,
  leads,
  wishes,
  api,
  onChanged,
}: {
  available: AddonId[];
  addons: AddonSelection[];
  onAddons: (next: AddonSelection[], anchors: string[]) => void;
  onShow: (anchors: string[]) => void;
  leads: Leads;
  wishes: Wish[];
  api: OrderApi;
  onChanged: () => void;
}) {
  const [channels, setChannels] = useState(leads);
  const [leadsSaved, setLeadsSaved] = useState(false);
  const [wish, setWish] = useState("");

  async function saveLeads(next: Leads) {
    setChannels(next);
    setLeadsSaved(false);
    // Почту сохраняем, когда её ввели; без каналов не сохраняем вовсе
    if (!next.channels.length || (next.channels.includes("email") && !next.email.includes("@"))) return;
    if (await api.call("leads", "leads", next)) setLeadsSaved(true);
  }

  return (
    <div className={s.stack}>
      <p className={s.text}>Всё, что входит в цену, уже на сайте. Здесь — то, что можно добавить. Фишки сразу появляются на прототипе.</p>

      <section aria-labelledby="leads-title">
        <h3 id="leads-title" className={s.h3}>
          Заявки и уведомления
        </h3>
        <p className={s.hint}>Куда присылать записи с сайта. Входит в цену, можно выбрать несколько.</p>
        <div className={s.choices}>
          {LEAD_CHANNELS.map((ch) => (
            <Choice
              key={ch}
              title={LEAD_LABEL[ch].title}
              why={LEAD_LABEL[ch].text}
              price="Входит"
              checked={channels.channels.includes(ch)}
              onChange={(on) => saveLeads({ ...channels, channels: on ? [...channels.channels, ch] : channels.channels.filter((x) => x !== ch) })}
            >
              {ch === "email" && (
                <div className={s.inline}>
                  <input
                    type="email"
                    className="input"
                    aria-label="Почта для заявок"
                    value={channels.email}
                    placeholder="hello@example.ru"
                    onChange={(e) => setChannels((c) => ({ ...c, email: e.target.value }))}
                    onBlur={() => saveLeads(channels)}
                  />
                </div>
              )}
            </Choice>
          ))}
        </div>
        <p className={s.hint} aria-live="polite">
          {!channels.channels.length ? "Выберите хотя бы один способ." : leadsSaved ? "Сохранено." : ""}
        </p>
      </section>

      {ADDON_GROUPS.map((g) => {
        const list = available.filter((id) => ADDONS[id].group === g.id);
        if (!list.length) return null;
        return (
          <section key={g.id} aria-labelledby={`add-${g.id}`}>
            <h3 id={`add-${g.id}`} className={s.h3}>
              {g.title}
            </h3>
            {g.lead && <p className={s.hint}>{g.lead}</p>}
            <div className={s.choices}>
              {list.map((id) => {
                const selection = addons.find((a) => a.id === id);
                const anchors = featureAnchors(id);
                return (
                  <div key={id} className={s.addon}>
                    <AddonChoice
                      addon={ADDONS[id]}
                      selection={selection}
                      onChange={(next) => onAddons(toggleAddon(addons, id, next), next ? anchors : [])}
                    />
                    {selection && ADDONS[id].preview && (
                      <button type="button" className={s.showOnSite} onClick={() => onShow(anchors)}>
                        Показать на сайте
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <section aria-labelledby="wish-title">
        <h3 id="wish-title" className={s.h3}>
          Не нашли нужное?
        </h3>
        <p className={s.hint}>Опишите своими словами — оценим и ответим. Это не тратит бесплатные правки.</p>
        <form
          className={s.form}
          onSubmit={async (e) => {
            e.preventDefault();
            if (await api.call("wish", "wish", { text: wish })) {
              setWish("");
              onChanged();
            }
          }}
        >
          <textarea
            className={`input ${s.short}`}
            aria-label="Что нужно"
            value={wish}
            onChange={(e) => setWish(e.target.value)}
            placeholder="Например: нужна запись на два филиала"
            maxLength={1000}
          />
          <div className={s.formActions}>
            <button type="submit" className="btn btn-secondary btn-small" disabled={api.busy !== null || wish.trim().length < 5}>
              {api.busy === "wish" ? "Отправляем…" : "Отправить"}
            </button>
          </div>
        </form>
        {wishes.length > 0 && (
          <ul className={s.revisions}>
            {wishes.map((w) => (
              <li key={w.id}>
                <p>{w.text}</p>
                <span>{w.status === "quoted" ? "Ответили" : "Оценим и ответим"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
