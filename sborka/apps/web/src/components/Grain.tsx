import s from "./Grain.module.css";

/** Плёночное зерно поверх страницы. */
export function Grain() {
  return <div className={s.grain} aria-hidden="true" />;
}
