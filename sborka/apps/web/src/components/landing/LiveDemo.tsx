"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { NicheId, SiteSpec } from "@/lib/sites/schema";
import { SiteRenderer } from "@/sites/SiteRenderer";
import { ArrowIcon } from "../ArrowIcon";
import { gsap, prefersReducedMotion } from "../motion";
import { RevealText } from "../RevealText";
import { GlowLines } from "./GlowLines";
import s from "./LiveDemo.module.css";

const CHIPS: { label: string; query: string }[] = [
  { label: "Кофейня", query: "кофейня в Казани" },
  { label: "Салон красоты", query: "салон маникюра в Москве" },
  { label: "Фитнес-студия", query: "фитнес-студия в Краснодаре" },
  { label: "Юридическая практика", query: "юрист по семейным делам" },
  { label: "Барбершоп", query: "барбершоп в Перми" },
  { label: "Стоматология", query: "стоматология в Самаре" },
];

// Порядок важен: более узкие сферы проверяются раньше общих
const KEYWORDS: [NicheId, RegExp][] = [
  ["dental", /стомат|зуб|дантист|ортодонт/i],
  ["barber", /барбер|мужск.*стриж|бород/i],
  ["florist", /цвет(ы|оч)|букет|флорист/i],
  ["photo", /фотограф|фотосъ[её]мк|фотостуди/i],
  ["cleaning", /клининг|уборк|чистк|мойк[аи] окон/i],
  ["fitness", /фитнес|трениров|спорт|йог|зал\b|растяжк|пилатес|кроссфит/i],
  ["legal", /юрист|адвокат|юридич|правов|нотари|банкрот/i],
  ["coffee", /коф|каф|кондитер|пекар|торт|десерт|выпечк|булоч/i],
  ["nails", /маникюр|ногт|салон|красот|бьюти|космет|бров|ресниц|педикюр/i],
  ["repair", /ремонт квартир|отделк|строит|квартир|ремонт дом|плитк/i],
  ["auto", /авто|машин|шиномонтаж|сто\b|автосервис|кузов/i],
  ["psychologist", /психолог|коуч|терапев|консульт|эксперт|наставник/i],
];

const STAGES = ["Анализируем запрос", "Пишем тексты", "Подбираем стиль", "Собираем страницу", "Готово"];

export function LiveDemo({ specs }: { specs: SiteSpec[] }) {
  const [query, setQuery] = useState("");
  const [niche, setNiche] = useState<NicheId>("coffee");
  const [progress, setProgress] = useState(100);
  const [miss, setMiss] = useState(false);
  const [scale, setScale] = useState(0.4);
  const screen = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tween = useRef<gsap.core.Tween | null>(null);
  const spec = specs.find((x) => x.niche === niche) ?? specs[0];

  useEffect(() => {
    const el = screen.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / 1280));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => () => void tween.current?.kill(), []);

  function build(text: string) {
    const match = KEYWORDS.find(([, re]) => re.test(text));
    if (!match) {
      setMiss(true);
      return;
    }
    setMiss(false);
    setNiche(match[0]);
    tween.current?.kill();
    if (prefersReducedMotion()) {
      setProgress(100);
      return;
    }
    const p = { v: 0 };
    setProgress(0);
    tween.current = gsap.to(p, { v: 100, duration: 3.2, ease: "power1.inOut", onUpdate: () => setProgress(Math.round(p.v)) });
  }

  const stage = STAGES[Math.min(STAGES.length - 1, Math.floor(progress / 25))];
  const done = progress >= 100;

  return (
    <section id="demo" className={s.section} aria-labelledby="demo-title">
      <GlowLines set="demo" />
      <div className={`container ${s.grid}`}>
        <div>
          <div className={s.top}>
            <span className="pill">Живое демо</span>
            <button type="button" className={s.try} onClick={() => inputRef.current?.focus()}>
              Попробуйте прямо сейчас
              <ArrowIcon size={14} />
            </button>
          </div>
          <RevealText id="demo-title" className="section-title">
            Опишите свой бизнес — и посмотрите, как собирается сайт
          </RevealText>

          <form
            className={s.form}
            onSubmit={(e) => {
              e.preventDefault();
              build(query);
            }}
          >
            <label htmlFor="demo-query" className="visually-hidden">
              Чем занимается ваш бизнес
            </label>
            <input
              ref={inputRef}
              id="demo-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="например: кофейня в Казани"
              autoComplete="off"
            />
            <button type="submit" aria-label="Собрать сайт">
              <ArrowIcon size={20} />
            </button>
          </form>
          {miss && (
            <p className={s.miss} role="status">
              Такую сферу пока не собираем. Выберите похожую из подсказок ниже — их 12, и список растёт.
            </p>
          )}

          <p className={s.popular}>Популярные запросы:</p>
          <div className={s.chips}>
            {CHIPS.map((c) => (
              <button
                key={c.label}
                type="button"
                className={s.chip}
                onClick={() => {
                  setQuery(c.query);
                  build(c.query);
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className={s.stage} aria-live="polite">
          <div className={`${s.float} ${s.f1}`} aria-hidden="true">
            <b>Цвета</b>
            <span className={s.swatches}>
              <i style={{ background: "var(--lime)" }} />
              <i style={{ background: "#2b2420" }} />
              <i style={{ background: "#e9e4da" }} />
              <i style={{ background: "#6b5848" }} />
            </span>
          </div>
          <div className={`${s.float} ${s.f2}`} aria-hidden="true">
            <b>Шрифты</b>
            <span className={s.aa}>Aa Aa</span>
          </div>
          <div className={`${s.float} ${s.f3}`} aria-hidden="true">
            <b>Блоки</b>
            <span className={s.blocks}>
              <i />
              <i />
              <i />
            </span>
          </div>

          <div className={s.browser}>
            <div className={s.bar}>
              <span className={s.dots}>
                <i />
                <i />
                <i />
              </span>
              <span className={s.address}>Прототип · {spec.business.name}</span>
            </div>
            <div ref={screen} className={s.screen} inert>
              <div className={s.scaler} style={{ transform: `scale(${scale})` }}>
                <SiteRenderer spec={spec} mode="example" />
              </div>
              {!done && (
                <>
                  <div className={s.cover} style={{ top: `${progress}%` }} />
                  <div className={s.scan} style={{ top: `${progress}%` }} />
                </>
              )}
            </div>
          </div>

          <div className={s.progressCard}>
            <p>{done ? "Сайт собран" : `${stage}…`}</p>
            <div className={s.progressRow}>
              <span className={s.track}>
                <i style={{ width: `${progress}%` }} />
              </span>
              <b>{progress}%</b>
            </div>
            {done && (
              <Link href={`/brief?niche=${niche}`} className={s.cta}>
                Собрать такой для себя
                <ArrowIcon size={14} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
