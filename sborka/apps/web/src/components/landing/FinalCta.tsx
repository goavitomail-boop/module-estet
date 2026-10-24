import Link from "next/link";
import s from "./FinalCta.module.css";

export function FinalCta() {
  return (
    <section className={s.section} aria-labelledby="final-title">
      <div className={`container ${s.inner}`}>
        <h2 id="final-title" className={s.title}>
          Посмотрите свой сайт до оплаты
        </h2>
        <p className={s.text}>Бриф займёт около пяти минут. Прототип появится в личном кабинете.</p>
        <Link href="/brief" className="btn btn-primary">
          Собрать сайт
        </Link>
      </div>
    </section>
  );
}
