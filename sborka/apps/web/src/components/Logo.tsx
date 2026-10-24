import Link from "next/link";
import s from "./Logo.module.css";

/** Знак: четыре блока — два ещё в чертеже, два уже собраны. */
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className={s.logo} aria-label="Сборка — на главную">
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
        <rect x="1" y="1" width="12" height="12" rx="2" fill="var(--lime)" />
        <rect x="15.5" y="1.5" width="11" height="11" rx="2" fill="none" stroke="var(--violet)" strokeWidth="1.5" />
        <rect x="1.5" y="15.5" width="11" height="11" rx="2" fill="none" stroke="var(--violet)" strokeWidth="1.5" />
        <rect x="15" y="15" width="12" height="12" rx="2" fill="var(--lime)" />
      </svg>
      <span>Сборка</span>
    </Link>
  );
}
