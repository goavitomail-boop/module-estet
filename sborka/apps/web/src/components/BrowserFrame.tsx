import type { ReactNode } from "react";
import s from "./BrowserFrame.module.css";

export function BrowserFrame({
  address,
  children,
  className,
}: {
  address: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${s.frame} ${className ?? ""}`}>
      <div className={s.bar}>
        <span className={s.dots} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className={s.address}>{address}</span>
      </div>
      <div className={s.body}>{children}</div>
    </div>
  );
}
