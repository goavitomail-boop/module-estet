"use client";

import { useEffect, useRef } from "react";
import type { Scene } from "@/lib/sites/effects";
import type { Build, Kit } from "./scenes/kit";
import f from "./fx.module.css";

/** Сцены лежат отдельными файлами и грузятся, только когда выбраны. */
const SCENES: Record<Scene, () => Promise<{ build: Build }>> = {
  "scene-orb": () => import("./scenes/orb"),
  "scene-particles": () => import("./scenes/particles"),
  "scene-wave": () => import("./scenes/wave"),
  "scene-rings": () => import("./scenes/rings"),
  "scene-knot": () => import("./scenes/knot"),
  "scene-crystal": () => import("./scenes/crystal"),
  "scene-glass": () => import("./scenes/glass"),
  "scene-shapes": () => import("./scenes/shapes"),
  "scene-silk": () => import("./scenes/silk"),
  "scene-helix": () => import("./scenes/helix"),
  "scene-globe": () => import("./scenes/globe"),
  "scene-strings": () => import("./scenes/strings"),
  "scene-cubes": () => import("./scenes/cubes"),
  "scene-terrain": () => import("./scenes/terrain"),
  "scene-warp": () => import("./scenes/warp"),
};

/** Сцены-«пол»: лежат в нижней части первого экрана и растворяются кверху. */
const FLOOR = new Set<Scene>(["scene-wave", "scene-cubes", "scene-terrain"]);

/**
 * 3D-сцена первого экрана на three.js — платное дополнение «3D-графика».
 * Цвета берутся из темы сайта. three.js и сцена подгружаются только здесь; пока сцена
 * вне экрана, кадры не рисуются; на телефоне меньше деталей и ниже плотность пикселей.
 */
export function Scene3D({ kind }: { kind: Scene }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const [THREE, { build }] = await Promise.all([import("three"), SCENES[kind]()]);
      if (disposed) return;
      const site = el.closest<HTMLElement>("[data-site]");
      const css = site ? getComputedStyle(site) : null;
      const color = (name: string, fallback: string) => new THREE.Color(css?.getPropertyValue(name).trim() || fallback);
      const accent = color("--s-accent", "#c8ff3d");
      const bg = color("--s-bg", "#0a0a0d");
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches || !site?.hasAttribute("data-anim");
      const small = window.innerWidth < 760;

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !small });
      } catch {
        return;
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

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        window.removeEventListener("pointermove", onMove);
        disposables.forEach((d) => d.dispose());
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [kind]);

  return <div ref={host} className={f.scene} data-scene={kind} data-floor={FLOOR.has(kind) || undefined} aria-hidden="true" />;
}
