"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowIcon } from "../ArrowIcon";
import { Logo } from "../Logo";
import s from "./Header.module.css";
import { NAV } from "./nav";


export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      setHidden(y > 400 && y > last + 2 ? true : y < last - 2 ? false : (h) => h);
      last = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <header className={`${s.header} ${scrolled ? s.scrolled : ""} ${hidden && !open ? s.hidden : ""}`}>
      <div className={`container ${s.inner}`}>
        <Logo />
        <nav className={s.nav} aria-label="Основная навигация">
          {NAV.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>
        <Link href="/brief" className={`btn btn-primary btn-small btn-dot ${s.cta}`}>
          Создать мой сайт
          <ArrowIcon size={16} />
        </Link>
        <button
          type="button"
          className={s.menuButton}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Закрыть" : "Меню"}
        </button>
      </div>
      <div id="mobile-menu" className={s.mobile} hidden={!open}>
        <nav aria-label="Мобильная навигация" className="container">
          {NAV.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          <Link href="/brief" className="btn btn-primary btn-dot" onClick={() => setOpen(false)}>
            Создать мой сайт
            <ArrowIcon />
          </Link>
        </nav>
      </div>
    </header>
  );
}
