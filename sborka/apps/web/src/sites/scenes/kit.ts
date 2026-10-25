import type * as T from "three";
import type { ShaderMountUniforms } from "@paper-design/shaders";
import type { Palette } from "./palette";

/**
 * Общее для 3D-сцен первого экрана: что сцена получает от Scene3D и чем пользуется.
 * three.js сюда не импортируется — он приходит в kit.THREE, чтобы грузиться один раз и только со сценой.
 */
export interface Kit {
  THREE: typeof T;
  scene: T.Scene;
  camera: T.PerspectiveCamera;
  renderer: T.WebGLRenderer;
  /** Цвета сайта. */
  accent: T.Color;
  bg: T.Color;
  /** Светлый фон сайта: другие смешивание и оттенки. */
  light: boolean;
  /** Телефон: меньше деталей. */
  small: boolean;
  /** Курсор от −0.5 до 0.5, плавно догоняет настоящий. */
  pointer: { x: number; y: number };
  /** Окно в пикселях и половина видимой ширины и высоты сцены на глубине 0 (для камеры на оси z). */
  view: { w: number; h: number; pw: number; ph: number };
  /** Точка окна в пикселях → координаты сцены на глубине 0. */
  at: (x: number, y: number) => { x: number; y: number };
  /** Пикселей в единице сцены на глубине 0. */
  px: () => number;
  /** Запомнить, что освободить, когда сцена уйдёт со страницы. */
  keep: <D extends { dispose: () => void }>(d: D) => D;
  /** Студийная комната из комплекта three.js — основа для бликов. */
  room: () => T.Scene & { dispose: () => void };
}

/** Сцена строит себя и возвращает шаг анимации: t — секунды с начала. */
export type Build = (kit: Kit) => (t: number) => void;

/**
 * Живой фон на шейдере: один проход видеокарты на весь первый экран («full»)
 * или объект в квадрате у правого края («object»). Цвета — из палитры сайта.
 */
export interface ShaderScene {
  place: "full" | "object";
  make: (p: Palette, small: boolean) => { fragment: string; uniforms: ShaderMountUniforms; speed?: number };
}

/** Цвет глянцевого металла: на тёмном фоне глубже, на светлом — светлее. */
export function metal(k: Kit) {
  return k.light ? k.accent.clone().lerp(new k.THREE.Color(0xffffff), 0.15) : k.accent.clone().multiplyScalar(0.55);
}

/**
 * Студийное окружение для бликов: комната с софтбоксами из комплекта three.js
 * и две светящиеся полосы в цвете акцента — блики на глянце получаются цветными.
 */
export function studio(k: Kit) {
  const { THREE } = k;
  const env = k.room();
  const parts: { dispose: () => void }[] = [];
  const strip = (power: number, w: number, h: number, p: [number, number, number], ry: number) => {
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.MeshBasicMaterial({ color: k.accent.clone().multiplyScalar(power), side: THREE.DoubleSide });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...p);
    m.rotation.y = ry;
    env.add(m);
    parts.push(geo, mat);
  };
  strip(6, 1.2, 8, [-6, 1, 1], Math.PI / 2);
  strip(4, 9, 0.5, [0, 6.5, -4], 0);
  const pmrem = new THREE.PMREMGenerator(k.renderer);
  const texture = k.keep(pmrem.fromScene(env, 0.035)).texture;
  pmrem.dispose();
  env.dispose();
  parts.forEach((p) => p.dispose());
  k.scene.environment = texture;
  return texture;
}

/**
 * Поставить объект радиусом 1 у правого края, на уровне заголовка и частично за краем:
 * так он не спорит с текстом и фото при любой композиции первого экрана.
 * size — радиус в долях ширины окна, max — предел в пикселях, inset — какая часть радиуса заходит за край.
 */
export function atEdge(k: Kit, obj: T.Object3D, { size = 0.17, max = 260, inset = 0.45 } = {}) {
  const r = Math.min(Math.max(k.view.pw * (k.small ? size * 1.5 : size), 100), max);
  const c = k.at(k.view.pw - r * inset, Math.min(k.view.ph * 0.34, k.small ? r + 40 : 300));
  obj.position.set(c.x, c.y, 0);
  obj.scale.setScalar(r / k.px());
  return r;
}

/** Светящиеся точки и линии: на тёмном фоне складываются в свечение, на светлом — обычные. */
export function glow(k: Kit) {
  return k.light ? k.THREE.NormalBlending : k.THREE.AdditiveBlending;
}
