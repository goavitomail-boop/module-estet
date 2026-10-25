import type { ShowcasePhotos } from "@/lib/showcase";
import s from "./ShowcaseSite.module.css";

/**
 * Тёмный сайт кофейни для витрины на лендинге. Блоки помечены data-sc,
 * чтобы витрина могла «собирать» их по очереди.
 */
export function ShowcaseSite({ photos }: { photos: ShowcasePhotos }) {
  return (
    <div className={s.site} aria-hidden="true">
      <div className={s.nav} data-sc="nav">
        <span className={s.brand}>
          Зерно и сахар
          <small>кофейня · десерты</small>
        </span>
        <span className={s.links}>
          <i>Меню</i>
          <i>О нас</i>
          <i>Контакты</i>
        </span>
        <span className={s.navBtn}>Заказать</span>
      </div>

      <div className={s.hero}>
        <div className={s.heroText} data-sc="text">
          <p className={s.title}>Лучший кофе в&nbsp;твоём городе</p>
          <p className={s.sub}>Обжариваем зерно небольшими партиями и печём десерты каждое утро.</p>
          <span className={s.btns}>
            <b>Заказать</b>
            <i>О нас</i>
          </span>
        </div>
        <div className={s.heroPhoto} data-sc="photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photos.hero} alt="" />
        </div>
      </div>

      <div className={s.menu} data-sc="menu">
        <p className={s.h}>Наши напитки</p>
        <div className={s.cards}>
          {photos.drinks.map((d) => (
            <div key={d.name} className={s.card}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={d.src} alt="" />
              <span>{d.name}</span>
              <b>{d.price}</b>
            </div>
          ))}
        </div>
      </div>

      <div className={s.about} data-sc="about">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photos.interior} alt="" />
        <div>
          <p className={s.h}>Уютное пространство для ваших идей</p>
          <p className={s.sub}>Двенадцать мест, большое окно и музыка без спешки.</p>
          <span className={s.btns}>
            <i>О нас</i>
          </span>
        </div>
      </div>
    </div>
  );
}
