import { REVIEWS } from "@/content/reviews";
import { RevealText } from "../RevealText";
import s from "./Reviews.module.css";

/** Отзывы клиентов. Пока настоящих отзывов нет, блок не выводится. */
export function Reviews() {
  if (REVIEWS.length === 0) return null;
  return (
    <section className={s.section} aria-labelledby="reviews-title">
      <div className="container">
        <RevealText id="reviews-title" className="section-title">
          Отзывы клиентов
        </RevealText>
        <ul className={s.grid}>
          {REVIEWS.map((r) => (
            <li key={r.name} className={`glass ${s.card}`}>
              <div className={s.author}>
                {r.photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.photo} alt="" width={48} height={48} />
                )}
                <span>
                  <b>{r.name}</b>
                  <small>{r.role}</small>
                </span>
              </div>
              <p>«{r.text}»</p>
              {r.rating && (
                <span className={s.stars} aria-label={`Оценка ${r.rating} из 5`}>
                  {"★".repeat(r.rating)}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
