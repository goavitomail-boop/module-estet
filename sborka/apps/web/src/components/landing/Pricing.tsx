import Link from "next/link";
import s from "./Pricing.module.css";

const INCLUDED = [
  "Одностраничный сайт под ваш бизнес",
  "Тексты, написанные под вашу сферу и город",
  "Версия для телефонов",
  "3 правки и 2 других варианта до оплаты",
  "Форма заявки на сайте",
  "Публикация на вашем домене и SSL-сертификат",
];

export function Pricing() {
  return (
    <section id="price" className={s.section} aria-labelledby="price-title">
      <div className={`container ${s.grid}`}>
        <div className={s.left}>
          <h2 id="price-title" className={s.title}>
            Сначала прототип, потом оплата
          </h2>
          <p className={s.text}>
            Вы видите готовый сайт до того, как платите. Не понравился — просто закройте вкладку, ничего не должны.
          </p>
        </div>

        <div className={s.card}>
          <p className={s.price}>
            4 999 ₽
          </p>
          <p className={s.once}>один раз, за готовый сайт</p>
          <ul className={s.list}>
            {INCLUDED.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className={s.note}>
            Домен оплачивается отдельно, по цене регистратора. Хостинг после публикации:{" "}
            <span className="todo">уточнить условия</span>
          </p>
          <Link href="/brief" className={`btn btn-primary ${s.cta}`}>
            Собрать сайт
          </Link>
        </div>
      </div>
    </section>
  );
}
