import Link from "next/link";
import { Logo } from "../Logo";
import { NAV } from "./nav";
import s from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={s.footer}>
      <div className={`container ${s.row}`}>
        <Logo />
        <nav className={s.nav} aria-label="Навигация в подвале">
          {NAV.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className={s.social}>
          <span>
            Telegram: <span className="todo">указать</span>
          </span>
          <span>
            ВКонтакте: <span className="todo">указать</span>
          </span>
        </div>
      </div>
      <div className={`container ${s.bottom}`}>
        <span>© {new Date().getFullYear()} Сборка. Все права защищены.</span>
        <span className={s.legal}>
          <Link href="/legal/offer" className="link">
            Публичная оферта
          </Link>
          <Link href="/legal/privacy" className="link">
            Политика конфиденциальности
          </Link>
          <span>
            Реквизиты: <span className="todo">указать после регистрации</span>
          </span>
        </span>
      </div>
    </footer>
  );
}
