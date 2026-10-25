import Link from "next/link";
import s from "./Logo.module.css";

/** Логотип-надпись «сборка» с лаймовой точкой. */
export function Logo({ href = "/", size = "m" }: { href?: string; size?: "m" | "l" }) {
  return (
    <Link href={href} className={`${s.logo} ${size === "l" ? s.large : ""}`} aria-label="Сборка — на главную">
      сборка<i aria-hidden="true" />
    </Link>
  );
}
