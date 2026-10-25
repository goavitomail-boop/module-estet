import Link from "next/link";
import { ArrowIcon } from "../ArrowIcon";
import { Logo } from "../Logo";
import { Magnetic } from "../Magnetic";
import { RevealText } from "../RevealText";
import { LightMountains } from "./LightMountains";
import s from "./FinalCta.module.css";

export function FinalCta() {
  return (
    <section className={s.section} aria-labelledby="final-title">
      <LightMountains className={s.mountains} />
      <div className={`container ${s.grid}`}>
        <div>
          <p className={s.kicker}>Готовы начать?</p>
          <RevealText id="final-title" className={s.title}>
            Ваш сайт — уже через 24 часа
          </RevealText>
          <p className={s.text}>Опишите свой бизнес и получите современный сайт по фиксированной цене 4 999 ₽.</p>
        </div>
        <div className={s.action}>
          <Magnetic strength={0.3}>
            <Link href="/brief" className="btn btn-primary btn-dot">
              Создать мой сайт
              <ArrowIcon />
            </Link>
          </Magnetic>
          <p className={s.note}>Бриф займёт около 5 минут</p>
        </div>
        <div className={s.brand}>
          <Logo size="l" />
          <p>Искусственный интеллект для вашего бизнеса</p>
        </div>
      </div>
    </section>
  );
}
