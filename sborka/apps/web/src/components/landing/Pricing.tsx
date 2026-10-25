import Link from "next/link";
import { Icon } from "@/sites/icons";
import { ArrowIcon } from "../ArrowIcon";
import { Magnetic } from "../Magnetic";
import { RevealText } from "../RevealText";
import { PriceTag } from "./PriceTag";
import { TiltCard } from "./TiltCard";
import s from "./Pricing.module.css";

const INCLUDED = [
  "Дизайн под ваш бизнес",
  "Тексты под вашу сферу и город",
  "Адаптивность (компьютер и телефон)",
  "До 3 правок и 2 варианта",
  "Публикация на хостинге",
  "Домен в подарок на 1 год",
];

const COMPARE: [string, string, string][] = [
  ["Цена", "4 999 ₽", "от 50 000 ₽"],
  ["Срок", "24 часа", "от 1 недели"],
  ["Дизайн", "ИИ + шаблоны", "Индивидуальный"],
  ["Тексты", "Включены", "Часто доплата"],
  ["Адаптивность", "Да", "Часто доплата"],
  ["Правки", "3 бесплатно", "Платно"],
  ["Публикация", "Да", "Часто доплата"],
  ["Предоплата", "Нет", "Обычно 50%"],
];

export function Pricing() {
  return (
    <section id="price" className={s.section} aria-labelledby="price-title">
      <div className={`container ${s.grid}`}>
        <div className={s.intro}>
          <p className={s.label}>Тарифы</p>
          <RevealText id="price-title" className="section-title">
            Простой и честный тариф
          </RevealText>
          <p className="section-sub">Всё включено: сайт, тексты, дизайн, адаптация под все устройства.</p>
          <Magnetic strength={0.2}>
            <Link href="/brief" className={`btn btn-primary btn-dot ${s.cta}`}>
              Создать мой сайт
              <ArrowIcon />
            </Link>
          </Magnetic>
          <p className={s.small}>Без предоплаты. Оплата после просмотра прототипа.</p>
        </div>

        <TiltCard className={s.card}>
          <span className={s.badge}>Всё включено</span>
          <p className={s.plan}>Сайт за 24 часа</p>
          <PriceTag className={s.price} />
          <ul className={s.list}>
            {INCLUDED.map((item) => (
              <li key={item}>
                <Icon name="check" size={16} />
                {item}
              </li>
            ))}
          </ul>
          <Link href="/brief" className={`btn btn-primary ${s.cardCta}`}>
            Создать мой сайт
          </Link>
        </TiltCard>

        <div className={s.compare}>
          <p className={s.compareTitle}>Сравнение</p>
          <table>
            <thead>
              <tr>
                <th scope="col">Возможности</th>
                <th scope="col" className={s.us}>
                  Сборка
                </th>
                <th scope="col">Веб-студия</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map(([k, us, them]) => (
                <tr key={k}>
                  <th scope="row">{k}</th>
                  <td className={s.us}>{us}</td>
                  <td>{them}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
