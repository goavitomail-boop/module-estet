import Link from "next/link";
import { Logo } from "../Logo";
import s from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={s.footer}>
      <div className={`container ${s.grid}`}>
        <div className={s.brand}>
          <Logo />
          <p>Сайты для малого бизнеса за 24 часа.</p>
        </div>
        <div>
          <h2 className={s.h}>Связаться</h2>
          <ul className={s.list}>
            <li>
              Telegram: <span className="todo">указать</span>
            </li>
            <li>
              Почта: <span className="todo">указать</span>
            </li>
          </ul>
        </div>
        <div>
          <h2 className={s.h}>Документы</h2>
          <ul className={s.list}>
            <li>
              <Link href="/legal/offer" className="link">
                Публичная оферта
              </Link>
            </li>
            <li>
              <Link href="/legal/privacy" className="link">
                Политика конфиденциальности
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <p className={s.giant} aria-hidden="true">
        Сборка
      </p>
      <div className={`container ${s.bottom}`}>
        <span>© {new Date().getFullYear()} Сборка</span>
        <span>
          Реквизиты: <span className="todo">указать после регистрации</span>
        </span>
      </div>
    </footer>
  );
}
