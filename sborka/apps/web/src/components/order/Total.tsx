import { quote, rub, type AddonSelection } from "@/lib/addons";
import { plural } from "@/lib/plural";
import s from "./total.module.css";

/** Итог заказа: разовая сумма и что оплачивается отдельно. */
export function Total({ addons, label = "Итого" }: { addons: AddonSelection[]; label?: string }) {
  const q = quote(addons);
  const extra = q.lines.length - 1;
  const notes = [
    extra > 0 ? `сайт ${rub(q.lines[0].amount)} + ${extra} ${plural(extra, "дополнение", "дополнения", "дополнений")}` : "сайт под ключ",
    ...q.monthly.map((m) => `${m.title.toLowerCase()} ${rub(m.amount)}/мес со 2-го месяца`),
    ...q.separate.map((m) => `${m.title.toLowerCase()} — отдельно, от ${rub(m.amount)}`),
  ];
  return (
    <div className={s.total} aria-live="polite">
      <span className={s.label}>{label}</span>
      <b className={s.sum}>{rub(q.total)}</b>
      <span className={s.notes}>{notes.join(" · ")}</span>
    </div>
  );
}
