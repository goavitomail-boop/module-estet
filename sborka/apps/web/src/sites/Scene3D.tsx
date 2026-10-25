"use client";

import { useEffect, useRef } from "react";
import type { Scene } from "@/lib/sites/effects";
import type { Build, Kit, ShaderScene } from "./scenes/kit";
import { makePalette } from "./scenes/palette";
import f from "./fx.module.css";

type Module = { build: Build } | { shader: ShaderScene };

/**
 * Как сцена встаёт на первый экран: живой фон на весь экран, объект в квадрате у правого края,
 * 3D-сцена на весь экран или 3D-«пол» внизу.
 */
type Kind = "full" | "object" | "three" | "floor";

/** Сцены лежат отдельными файлами и грузятся, только когда выбраны. */
const SCENES: Record<Scene, [Kind, () => Promise<Module>]> = {
  "scene-satin": ["full", () => import("./scenes/glsl/satin")],
  "scene-chrome": ["full", () => import("./scenes/glsl/chrome")],
  "scene-mesh": ["full", () => import("./scenes/paper/mesh")],
  "scene-pearl": ["full", () => import("./scenes/glsl/pearl")],
  "scene-grain": ["full", () => import("./scenes/paper/grain-corners")],
  "scene-plasma": ["full", () => import("./scenes/glsl/plasma")],
  "scene-curtains": ["full", () => import("./scenes/glsl/curtains")],
  "scene-spotlight": ["full", () => import("./scenes/glsl/spotlight")],
  "scene-rays": ["full", () => import("./scenes/paper/rays")],
  "scene-threads": ["full", () => import("./scenes/glsl/threads")],
  "scene-bends": ["full", () => import("./scenes/glsl/bends")],
  "scene-glow": ["full", () => import("./scenes/glsl/glow")],
  "scene-bokeh": ["full", () => import("./scenes/glsl/bokeh")],
  "scene-marble": ["full", () => import("./scenes/paper/marble")],
  "scene-swirl": ["full", () => import("./scenes/paper/swirl")],
  "scene-neuro": ["full", () => import("./scenes/paper/neuro")],
  "scene-water": ["full", () => import("./scenes/paper/water")],
  "scene-topo": ["full", () => import("./scenes/glsl/topo")],
  "scene-halftone": ["full", () => import("./scenes/glsl/halftone")],
  "scene-stars": ["full", () => import("./scenes/glsl/stars")],
  "scene-dots": ["full", () => import("./scenes/paper/dots")],
  "scene-blobs": ["full", () => import("./scenes/paper/blobs")],
  "scene-cells": ["full", () => import("./scenes/paper/cells")],
  "scene-grain-wave": ["full", () => import("./scenes/paper/grain-wave")],
  "scene-ripple": ["full", () => import("./scenes/paper/grain-ripple")],
  "scene-border": ["full", () => import("./scenes/paper/border")],
  "scene-dither": ["full", () => import("./scenes/paper/dither")],
  "scene-spiral": ["full", () => import("./scenes/paper/spiral")],
  "scene-beams": ["full", () => import("./scenes/glsl/beams")],
  "scene-metal": ["object", () => import("./scenes/paper/metal-drop")],
  "scene-metal-flower": ["object", () => import("./scenes/paper/metal-flower")],
  "scene-gem": ["object", () => import("./scenes/paper/gem")],
  "scene-smoke": ["object", () => import("./scenes/paper/smoke")],
  "scene-metaballs": ["object", () => import("./scenes/paper/metaballs")],
  "scene-panels": ["object", () => import("./scenes/paper/panels")],
  "scene-orb": ["three", () => import("./scenes/orb")],
  "scene-glass": ["three", () => import("./scenes/glass")],
  "scene-crystal": ["three", () => import("./scenes/crystal")],
  "scene-knot": ["three", () => import("./scenes/knot")],
  "scene-rings": ["three", () => import("./scenes/rings")],
  "scene-shapes": ["three", () => import("./scenes/shapes")],
  "scene-helix": ["three", () => import("./scenes/helix")],
  "scene-globe": ["three", () => import("./scenes/globe")],
  "scene-particles": ["three", () => import("./scenes/particles")],
  "scene-strings": ["three", () => import("./scenes/strings")],
  "scene-warp": ["three", () => import("./scenes/warp")],
  "scene-wave": ["floor", () => import("./scenes/wave")],
  "scene-cubes": ["floor", () => import("./scenes/cubes")],
  "scene-terrain": ["floor", () => import("./scenes/terrain")],
  "scene-silk": ["three", () => import("./scenes/silk")],
};

interface Ctx {
  site: HTMLElement | null;
  css: CSSStyleDeclaration | null;
  still: boolean;
  small: boolean;
}

/**
 * Премиум-графика первого экрана — платное дополнение «3D-графика»: живые фоны на шейдерах
 * и 3D-сцены на three.js. Цвета берутся из темы сайта, код сцены подгружается только здесь.
 * Пока сцена вне экрана, кадры не рисуются; на телефоне меньше деталей и ниже плотность пикселей.
 */
export function Scene3D({ kind }: { kind: Scene }) {
  const host = useRef<HTMLDivElement>(null);
  const object = useRef<HTMLDivElement>(null);
  const [place, load] = SCENES[kind];

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const mod = await load();
      if (disposed) return;
      const site = el.closest<HTMLElement>("[data-site]");
      const ctx: Ctx = {
        site,
        css: site ? getComputedStyle(site) : null,
        still: window.matchMedia("(prefers-reduced-motion: reduce)").matches || !site?.hasAttribute("data-anim"),
        small: window.innerWidth < 760,
      };
      const stop =
        "shader" in mod
          ? await runShader(object.current ?? el, mod.shader, ctx, () => disposed)
          : await runThree(el, mod.build, ctx, () => disposed);
      if (disposed) stop();
      else cleanup = stop;
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [load]);

  return (
    <div
      ref={host}
      className={f.scene}
      data-scene={kind}
      data-floor={place === "floor" || undefined}
      data-full={place === "full" || undefined}
      aria-hidden="true"
    >
      {place === "object" && <div ref={object} className={f.sceneObject} />}
      {/* Под заголовком фон приглушён, чтобы текст читался на любом эффекте */}
      {place === "full" && <div className={f.sceneScrim} />}
    </div>
  );
}

/** Живой фон на шейдере через ShaderMount из Paper Shaders: он сам следит за размером и видимостью. */
async function runShader(el: HTMLElement, scene: ShaderScene, ctx: Ctx, gone: () => boolean) {
  const { ShaderMount } = await import("@paper-design/shaders");
  const read = (name: string, fallback: string) => ctx.css?.getPropertyValue(name).trim() || fallback;
  const bg = read("--s-bg", "#0a0a0d");
  const lightSite = luminance(bg) > 0.5;
  // Поверх фото текст светлый — там палитра всегда тёмная
  const overPhoto = ctx.site?.dataset.hero === "overlay";
  const palette = makePalette(read("--s-accent", "#c8ff3d"), bg, read("--s-text", "#ffffff"), !lightSite || overPhoto);
  const { fragment, uniforms, speed = 1 } = scene.make(palette, ctx.small);
  // Картинки (шум, пустой пиксель) шейдер берёт только загруженными
  await Promise.all(Object.values(uniforms).map((u) => (u instanceof HTMLImageElement ? u.decode().catch(() => {}) : null)));
  if (gone()) return () => {};
  let mount: InstanceType<typeof ShaderMount>;
  try {
    mount = new ShaderMount(
      el,
      fragment,
      uniforms,
      { alpha: true, premultipliedAlpha: true },
      ctx.still ? 0 : speed,
      // Неподвижный кадр — не самый первый, а уже «разыгравшийся»
      8000,
      1,
      ctx.small ? 900_000 : 2_600_000,
    );
  } catch {
    return () => {};
  }
  return () => mount.dispose();
}

function luminance(color: string) {
  const n = parseInt(color.replace("#", "").slice(0, 6), 16);
  if (Number.isNaN(n)) return 0;
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

/** 3D-сцена на three.js: камера, курсор, размеры, пауза вне экрана. */
async function runThree(el: HTMLElement, build: Build, ctx: Ctx, gone: () => boolean) {
  const [THREE, { RoomEnvironment }] = await Promise.all([import("three"), import("three/examples/jsm/environments/RoomEnvironment.js")]);
  if (gone()) return () => {};
  const color = (name: string, fallback: string) => new THREE.Color(ctx.css?.getPropertyValue(name).trim() || fallback);
  const accent = color("--s-accent", "#c8ff3d");
  const bg = color("--s-bg", "#0a0a0d");
  const { still, small } = ctx;

  let renderer: InstanceType<typeof THREE.WebGLRenderer>;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !small });
  } catch {
    return () => {};
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.75));
  el.appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 6);
  const disposables: Array<{ dispose: () => void }> = [];
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const view = { w: 3, h: 2, pw: 1, ph: 1 };
  const kit: Kit = {
    THREE,
    scene: new THREE.Scene(),
    camera,
    renderer,
    accent,
    bg,
    light: bg.r * 0.2126 + bg.g * 0.7152 + bg.b * 0.0722 > 0.5,
    small,
    pointer,
    view,
    at: (x, y) => ({ x: (x / view.pw - 0.5) * 2 * view.w, y: -(y / view.ph - 0.5) * 2 * view.h }),
    px: () => view.ph / (2 * view.h),
    keep: (d) => {
      disposables.push(d);
      return d;
    },
    room: () => new RoomEnvironment(),
  };

  const resize = () => {
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    view.h = Math.tan(((camera.fov / 2) * Math.PI) / 180) * camera.position.z;
    view.w = view.h * camera.aspect;
    view.pw = w;
    view.ph = h;
  };
  // Размеры нужны сцене уже при сборке; камеру она может переставить — тогда пересчитываем
  resize();
  const step = build(kit);
  resize();

  const onMove = (e: PointerEvent) => {
    pointer.tx = e.clientX / window.innerWidth - 0.5;
    pointer.ty = e.clientY / window.innerHeight - 0.5;
  };
  const renderStill = () => {
    step(2);
    renderer.render(kit.scene, camera);
  };

  let raf = 0;
  let visible = true;
  const start = performance.now();
  const frame = () => {
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    step((performance.now() - start) / 1000);
    renderer.render(kit.scene, camera);
    raf = visible ? requestAnimationFrame(frame) : 0;
  };
  const ro = new ResizeObserver(() => {
    resize();
    if (still) renderStill();
  });
  ro.observe(el);
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf && !still) raf = requestAnimationFrame(frame);
  });
  io.observe(el);
  if (still) renderStill();
  else {
    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(frame);
  }

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    io.disconnect();
    window.removeEventListener("pointermove", onMove);
    disposables.forEach((d) => d.dispose());
    renderer.dispose();
    renderer.domElement.remove();
  };
}
