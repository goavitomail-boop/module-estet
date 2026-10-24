import type { ReactNode } from "react";
import { Logo } from "./Logo";
import s from "./PageHeader.module.css";

/** Шапка внутренних страниц: бриф, кабинет, оплата. */
export function PageHeader({ children }: { children?: ReactNode }) {
  return (
    <header className={s.header}>
      <div className={`container ${s.inner}`}>
        <Logo />
        {children && <div className={s.aside}>{children}</div>}
      </div>
    </header>
  );
}
