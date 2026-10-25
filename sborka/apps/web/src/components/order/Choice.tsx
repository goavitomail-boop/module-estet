"use client";

import { useId, useState, type ReactNode } from "react";
import { ADDONS, rub, type Addon, type AddonSelection } from "@/lib/addons";
import s from "./choice.module.css";

/**
 * Пункт выбора для человека, который не разбирается в сайтах:
 * что это, зачем это ему, сколько стоит и подробнее — по кнопке.
 */
export function Choice({
  title,
  why,
  details,
  price,
  checked,
  locked,
  onChange,
  children,
  badge,
}: {
  title: string;
  why: string;
  details?: string;
  /** «Входит», «+990 ₽», «490 ₽/мес». */
  price: string;
  checked: boolean;
  /** Всегда включено, снять нельзя. */
  locked?: boolean;
  onChange?: (checked: boolean) => void;
  /** Количество или вариант — показываются, когда пункт выбран. */
  children?: ReactNode;
  badge?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const free = price === "Входит";
  return (
    <div className={s.choice} data-checked={checked || undefined} data-locked={locked || undefined}>
      <label className={s.main} htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={locked}
          onChange={(e) => onChange?.(e.target.checked)}
          aria-describedby={`${id}-why`}
        />
        <span className={s.body}>
          <span className={s.head}>
            <b>{title}</b>
            {badge && <em className={s.badge}>{badge}</em>}
            <span className={s.price} data-free={free || undefined}>
              {price}
            </span>
          </span>
          <span id={`${id}-why`} className={s.why}>
            {why}
          </span>
        </span>
      </label>
      {details && (
        <button type="button" className={s.more} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? "Скрыть" : "Подробнее"}
        </button>
      )}
      {details && open && <p className={s.details}>{details}</p>}
      {checked && children && <div className={s.extra}>{children}</div>}
    </div>
  );
}

/** Подпись цены дополнения. */
export function addonPriceLabel(addon: Addon) {
  if (addon.separate) return `от ${rub(addon.price)}`;
  if (addon.billing === "monthly") return `${rub(addon.price)}/мес`;
  return `+${rub(addon.price)}`;
}

/** Карточка дополнения: выбор, количество страниц, вариант мини-приложения. */
export function AddonChoice({
  addon,
  selection,
  onChange,
  badge,
}: {
  addon: Addon;
  selection?: AddonSelection;
  onChange: (next: AddonSelection | null) => void;
  badge?: string;
}) {
  const checked = !!selection;
  const unit = addon.unit ? ` ${addon.unit}` : "";
  const details = [addon.details, addon.separate ? "Это отдельный заказ: в оплату сайта не входит." : ""].filter(Boolean).join(" ");
  return (
    <Choice
      title={addon.title}
      why={addon.why}
      details={details + (unit && addon.billing === "once" ? ` Цена${unit}.` : "")}
      price={addonPriceLabel(addon)}
      checked={checked}
      badge={badge}
      onChange={(on) => onChange(on ? { id: addon.id, ...(addon.maxQty ? { qty: 1 } : {}), ...(addon.options ? { option: addon.options[0].id } : {}) } : null)}
    >
      {addon.maxQty && selection && (
        <div className={s.qty}>
          <span>Сколько страниц</span>
          <button type="button" aria-label="Меньше" disabled={(selection.qty ?? 1) <= 1} onClick={() => onChange({ ...selection, qty: (selection.qty ?? 1) - 1 })}>
            −
          </button>
          <output>{selection.qty ?? 1}</output>
          <button
            type="button"
            aria-label="Больше"
            disabled={(selection.qty ?? 1) >= addon.maxQty}
            onClick={() => onChange({ ...selection, qty: (selection.qty ?? 1) + 1 })}
          >
            +
          </button>
        </div>
      )}
      {addon.options && selection && (
        <div className={s.options} role="radiogroup" aria-label="Где нужно приложение">
          {addon.options.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={selection.option === o.id}
              onClick={() => onChange({ ...selection, option: o.id })}
            >
              {o.title}
              <small>от {rub(o.price)}</small>
            </button>
          ))}
        </div>
      )}
    </Choice>
  );
}

/** Переключить дополнение в списке. */
export function toggleAddon(list: AddonSelection[], id: Addon["id"], next: AddonSelection | null) {
  const rest = list.filter((x) => x.id !== id);
  return next ? [...rest, next].sort((a, b) => rank(a.id) - rank(b.id)) : rest;
}

const rank = (id: Addon["id"]) => Object.keys(ADDONS).indexOf(id);
