import Link from "next/link";
import { Magnetic } from "../Magnetic";
import { RevealText } from "../RevealText";
import s from "./FinalCta.module.css";

const RING = "сайт за 24 часа · оплата после просмотра · ";

export function FinalCta() {
  return (
    <section className={s.section} aria-labelledby="final-title">
      <div className={`container ${s.inner}`}>
        <RevealText id="final-title" className={s.title}>
          Посмотрите свой сайт до оплаты
        </RevealText>
        <p className={s.text}>Бриф займёт около пяти минут. Прототип появится в личном кабинете.</p>
        <Magnetic strength={0.4}>
          <Link href="/brief" className={s.round}>
            <svg className={s.ring} viewBox="0 0 200 200" aria-hidden="true">
              <defs>
                <path id="cta-ring" d="M100,100 m-82,0 a82,82 0 1,1 164,0 a82,82 0 1,1 -164,0" />
              </defs>
              <text>
                <textPath href="#cta-ring" textLength="512">
                  {RING}
                </textPath>
              </text>
            </svg>
            <span className={s.roundLabel}>Собрать сайт</span>
          </Link>
        </Magnetic>
      </div>
    </section>
  );
}
