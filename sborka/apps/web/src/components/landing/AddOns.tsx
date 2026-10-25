"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  BellRingingIcon,
  ChatCircleDotsIcon,
  CheckIcon,
  CreditCardIcon,
  DeviceMobileIcon,
  LightningIcon,
  MapPinIcon,
  PlusIcon,
  ShieldCheckIcon,
  SparkleIcon,
  StackIcon,
} from "@phosphor-icons/react/ssr";
import { ArrowIcon } from "../ArrowIcon";
import { Magnetic } from "../Magnetic";
import { gsap, prefersReducedMotion, ScrollTrigger } from "../motion";
import { RevealText } from "../RevealText";
import { TiltCard } from "./TiltCard";
import s from "./AddOns.module.css";

type Platform = "tg" | "max";

// Цены на доп. услуги — предложение «Сборки», владелец подтверждает их перед запуском.

const PLATFORMS: Record<Platform, { tab: string; title: string; price: string; caption: string }> = {
  tg: { tab: "Telegram", title: "Мини-приложение в Telegram", price: "от 9 990 ₽", caption: "кнопка в профиле бота и в канале" },
  max: { tab: "MAX", title: "Мини-приложение в MAX", price: "от 9 990 ₽", caption: "кнопка в чате и в канале компании" },
};

const FEATURES = [
  { icon: ChatCircleDotsIcon, title: "Запись и заказ в два касания", text: "Меню, услуги и свободное время — прямо в чате, без установки." },
  { icon: BellRingingIcon, title: "Напоминания и статусы", text: "Бот пишет клиенту: «заказ готов», «запись завтра в 12:00»." },
  { icon: DeviceMobileIcon, title: "В стиле вашего сайта", text: "Цвета, тексты и фото берём из того же брифа." },
  { icon: CreditCardIcon, title: "Оплата — по желанию", text: "Подключим приём оплаты, если он нужен." },
];

const EXTRAS = [
  { icon: StackIcon, kind: "stack", title: "Дополнительная страница", text: "Прайс, портфолио или отдельная страница услуги.", price: "1 990 ₽" },
  { icon: MapPinIcon, kind: "pin", title: "Яндекс Карты и Метрика", text: "Карта проезда на сайте и статистика посещений.", price: "990 ₽" },
  { icon: LightningIcon, kind: "bolt", title: "Срочно за 3 часа", text: "Соберём и опубликуем в тот же день.", price: "+1 990 ₽" },
  { icon: ShieldCheckIcon, kind: "shield", title: "Хостинг и поддержка", text: "Со второго месяца: мелкие правки, обновления, резервные копии.", price: "490 ₽/мес" },
];

const MENU = [
  { name: "Капучино", price: 220, img: "/images/niches/coffee-service-1.webp" },
  { name: "Круассан с миндалём", price: 190, img: "/images/niches/coffee-service-2.webp" },
  { name: "Флэт уайт", price: 250, img: "/images/niches/coffee-gallery-4.webp" },
];

/** Дополнительные услуги: мини-приложения в мессенджерах (с живой демонстрацией) и доработки сайта. */
export function AddOns() {
  const root = useRef<HTMLElement>(null);
  const phone = useRef<HTMLDivElement>(null);
  const [platform, setPlatform] = useState<Platform>("tg");

  // Появление секции
  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap
        .timeline({ scrollTrigger: { trigger: el, start: "top 70%", once: true } })
        .from("[data-ao-phone]", { y: 120, rotationY: -24, rotationX: 10, opacity: 0, duration: 1.4, ease: "expo.out", transformPerspective: 1400 })
        .from("[data-ao-chip]", { opacity: 0, scale: 0.6, y: 20, duration: 0.8, stagger: 0.12, ease: "back.out(1.8)" }, "-=0.9")
        .from("[data-ao-feature]", { opacity: 0, x: -30, duration: 0.8, stagger: 0.1, ease: "expo.out" }, "-=1")
        .from("[data-ao-extra]", { opacity: 0, y: 40, duration: 0.9, stagger: 0.1, ease: "expo.out" }, "-=0.6");
    }, el);
    return () => ctx.revert();
  }, []);

  // Сценарий в телефоне: вопрос в чате → кнопка → мини-приложение → заказ → уведомление
  useEffect(() => {
    const el = phone.current;
    if (!el) return;
    const q = gsap.utils.selector(el);
    // Сумму меняет анимация, поэтому у React в этом теге нет своего текста
    const sum = q("[data-sum]")[0] as HTMLElement | undefined;
    if (sum) sum.textContent = "410 ₽";
    if (prefersReducedMotion()) {
      gsap.set(q("[data-msg]"), { opacity: 1 });
      gsap.set(q("[data-sheet]"), { yPercent: 0 });
      gsap.set(q("[data-main]"), { yPercent: 0, opacity: 1 });
      return;
    }
    const ctx = gsap.context(() => {
      const tap = q("[data-finger]");
      const screen = q("[data-screen]")[0] as HTMLElement;
      // Центр элемента относительно экрана телефона — по раскладке, без учёта анимаций
      const center = (t: HTMLElement) => {
        let x = t.offsetWidth / 2;
        let y = t.offsetHeight / 2;
        let n: HTMLElement | null = t;
        while (n && n !== screen) {
          x += n.offsetLeft;
          y += n.offsetTop;
          n = n.offsetParent as HTMLElement | null;
        }
        return { x, y };
      };
      const to = (target: string, at: number) => {
        const t = q(target)[0] as HTMLElement | undefined;
        if (!t) return;
        const { x, y } = center(t);
        tl.to(tap, { x, y, opacity: 1, duration: 0.5, ease: "power2.inOut" }, at);
        tl.to(tap, { scale: 0.7, duration: 0.12, yoyo: true, repeat: 1 }, at + 0.5);
      };
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.6, paused: true, defaults: { ease: "expo.out" } });
      tl.set(q("[data-msg]"), { opacity: 0, y: 14, scale: 0.96 })
        .set(q("[data-typing]"), { opacity: 0 })
        .set(q("[data-sheet]"), { yPercent: 104 })
        .set(q("[data-main]"), { yPercent: 140, opacity: 0 })
        .set(q("[data-done]"), { opacity: 0 })
        .set(q("[data-qty]"), { scale: 0, opacity: 0 })
        .set(q("[data-sum]"), { textContent: "220 ₽" })
        .set(q("[data-check]"), { strokeDashoffset: 60 })
        .set(tap, { opacity: 0, x: 200, y: 560, scale: 1 })
        .to(q("[data-msg='1']"), { opacity: 1, y: 0, scale: 1, duration: 0.5 }, 0.4)
        .to(q("[data-typing]"), { opacity: 1, duration: 0.2 }, 0.9)
        .to(q("[data-typing]"), { opacity: 0, duration: 0.2 }, 1.7)
        .to(q("[data-msg='2']"), { opacity: 1, y: 0, scale: 1, duration: 0.5 }, 1.8);
      to("[data-open-app]", 2.4);
      tl.to(q("[data-sheet]"), { yPercent: 0, duration: 0.8 }, 3.1);
      to("[data-add='0']", 4.0);
      tl.to(q("[data-qty='0']"), { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(3)" }, 4.55)
        .to(q("[data-main]"), { yPercent: 0, opacity: 1, duration: 0.6 }, 4.6);
      to("[data-add='1']", 5.1);
      tl.to(q("[data-qty='1']"), { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(3)" }, 5.65)
        .set(q("[data-sum]"), { textContent: "410 ₽" }, 5.7)
        .fromTo(q("[data-main]"), { scale: 1 }, { scale: 1.04, duration: 0.15, yoyo: true, repeat: 1 }, 5.7);
      to("[data-main]", 6.2);
      tl.to(q("[data-done]"), { opacity: 1, duration: 0.4 }, 6.9)
        .to(q("[data-check]"), { strokeDashoffset: 0, duration: 0.6, ease: "power2.out" }, 7.0)
        .to(tap, { opacity: 0, duration: 0.3 }, 7.1)
        .to(q("[data-sheet]"), { yPercent: 104, duration: 0.7, ease: "power3.in" }, 8.6)
        .to(q("[data-msg='3']"), { opacity: 1, y: 0, scale: 1, duration: 0.6 }, 9.4)
        .fromTo(q("[data-bell]"), { rotation: -18 }, { rotation: 18, duration: 0.1, yoyo: true, repeat: 7, ease: "none" }, 9.5)
        .to({}, { duration: 2 });
      // Сценарий идёт, только пока телефон виден
      ScrollTrigger.create({ trigger: el, start: "top 90%", end: "bottom 10%", onToggle: (st) => (st.isActive ? tl.play() : tl.pause()) });
    }, el);
    return () => ctx.revert();
  }, []);

  const p = PLATFORMS[platform];
  return (
    <section id="addons" ref={root} className={s.section} aria-labelledby="addons-title">
      <div className="container">
        <div className={s.head}>
          <span className="pill pill-lime">
            <SparkleIcon size={14} weight="fill" aria-hidden="true" />
            Дополнительные услуги
          </span>
          <RevealText id="addons-title" className="section-title">
            Ваш бизнес — прямо в мессенджере
          </RevealText>
          <p className="section-sub">
            Мини-приложение в Telegram и MAX: клиенты записываются и заказывают, не выходя из чата. Делаем из того же брифа, что и
            сайт.
          </p>
        </div>

        <div className={s.stage}>
          <div className={s.info}>
            <div className={s.tabs} role="tablist" aria-label="Мессенджер" style={{ "--x": platform === "tg" ? 0 : 1 } as CSSProperties}>
              <span className={s.tabThumb} aria-hidden="true" />
              {(Object.keys(PLATFORMS) as Platform[]).map((k) => (
                <button key={k} type="button" role="tab" aria-selected={platform === k} onClick={() => setPlatform(k)}>
                  {PLATFORMS[k].tab}
                </button>
              ))}
            </div>
            <div className={s.offer} key={platform}>
              <p className={s.offerTitle}>{p.title}</p>
              <p className={s.offerPrice}>
                <b>{p.price}</b>
                <small>{p.caption}</small>
              </p>
              <p className={s.bundle}>
                Telegram и MAX вместе — <b>14 990 ₽</b>
              </p>
            </div>
            <ul className={s.features}>
              {FEATURES.map((f) => (
                <li key={f.title} data-ao-feature>
                  <span className={s.featureIcon}>
                    <f.icon size={22} weight="duotone" aria-hidden="true" />
                  </span>
                  <span>
                    <b>{f.title}</b>
                    {f.text}
                  </span>
                </li>
              ))}
            </ul>
            <Magnetic strength={0.2}>
              <Link href="/brief" className={`btn btn-primary btn-dot ${s.cta}`}>
                Добавить к заказу
                <ArrowIcon />
              </Link>
            </Magnetic>
          </div>

          <div className={s.scene}>
            <div className={s.glow} aria-hidden="true" />
            {["Открывается за секунду", "Без установки", "Уведомления в чат", "Запись и оплата внутри"].map((t, i) => (
              <span key={t} className={s.chip} data-ao-chip style={{ "--i": i } as CSSProperties}>
                <CheckIcon size={14} weight="bold" aria-hidden="true" />
                {t}
              </span>
            ))}

            <div className={s.phone} data-ao-phone data-platform={platform} ref={phone} aria-label={`Пример мини-приложения в ${p.tab}`} role="img">
              <div className={s.screen} data-screen>
                <div className={s.bar}>
                  <span>9:41</span>
                  <span className={s.island} />
                  <span>●●●</span>
                </div>
                <div className={s.chatHead}>
                  <span className={s.avatar}>З</span>
                  <span>
                    <b>Зерно и сахар</b>
                    <small>{platform === "tg" ? "бот" : "чат-бот компании"}</small>
                  </span>
                  <span className={s.bell} data-bell>
                    <BellRingingIcon size={18} weight="fill" aria-hidden="true" />
                  </span>
                </div>
                <div className={s.chat}>
                  <p className={`${s.msg} ${s.out}`} data-msg="1">
                    Хочу кофе с собой к 9:40
                  </p>
                  <p className={s.typing} data-typing>
                    <i />
                    <i />
                    <i />
                  </p>
                  <div className={`${s.msg} ${s.in}`} data-msg="2">
                    Доброе утро! Меню и заказ — в приложении, приготовим к вашему приходу.
                    <span className={s.openApp} data-open-app>
                      Открыть меню
                    </span>
                  </div>
                  <p className={`${s.msg} ${s.in} ${s.notice}`} data-msg="3">
                    <b>Заказ №128 принят</b>
                    Капучино и круассан будут готовы к 9:40.
                  </p>
                </div>
                <div className={s.input}>
                  <span>Сообщение</span>
                </div>

                <div className={s.sheet} data-sheet>
                  <span className={s.grab} />
                  <p className={s.appTitle}>Зерно и сахар</p>
                  <div className={s.appTabs}>
                    <span data-on>Кофе</span>
                    <span>Выпечка</span>
                    <span>Десерты</span>
                  </div>
                  <ul className={s.items}>
                    {MENU.map((m, i) => (
                      <li key={m.name}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={m.img} alt="" />
                        <span>
                          <b>{m.name}</b>
                          {m.price} ₽
                        </span>
                        <span className={s.add} data-add={i}>
                          <PlusIcon size={14} weight="bold" aria-hidden="true" />
                          <i className={s.qty} data-qty={i}>
                            1
                          </i>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className={s.main} data-main>
                    Заказать · <span data-sum />
                  </div>
                  <div className={s.done} data-done>
                    <svg viewBox="0 0 52 52" aria-hidden="true">
                      <circle cx="26" cy="26" r="22" />
                      <path data-check d="m16 27 7 7 14-15" />
                    </svg>
                    <b>Заказ принят</b>
                    <small>Будет готов к 9:40</small>
                  </div>
                </div>
                <span className={s.finger} data-finger aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>

        <div className={s.extrasHead}>
          <h3>Ещё к сайту</h3>
          <p>Подключаем по желанию — до или после публикации.</p>
        </div>
        <ul className={s.extras}>
          {EXTRAS.map((x) => (
            <li key={x.title} data-ao-extra>
              <TiltCard className={s.extra}>
                <span className={s.extraIcon} data-kind={x.kind}>
                  <x.icon size={28} weight="duotone" aria-hidden="true" />
                </span>
                <h4>{x.title}</h4>
                <p>{x.text}</p>
                <span className={s.extraPrice}>{x.price}</span>
              </TiltCard>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
