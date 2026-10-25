"use client";

import { useEffect, useRef } from "react";
import type { Scene } from "@/lib/sites/effects";
import f from "./fx.module.css";

/**
 * 3D-сцена первого экрана на three.js — платное дополнение «3D-графика».
 * Цвета берутся из темы сайта. three.js подгружается только здесь; пока сцена
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
      const THREE = await import("three");
      if (disposed) return;
      const site = el.closest<HTMLElement>("[data-site]");
      const css = site ? getComputedStyle(site) : null;
      const color = (name: string, fallback: string) => new THREE.Color(css?.getPropertyValue(name).trim() || fallback);
      const accent = color("--s-accent", "#c8ff3d");
      const bg = color("--s-bg", "#0a0a0d");
      const light = bg.r * 0.2126 + bg.g * 0.7152 + bg.b * 0.0722 > 0.5;
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
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
      const disposables: Array<{ dispose: () => void }> = [];
      const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
      /** Размер окна в пикселях и половина видимой ширины и высоты сцены на глубине 0. */
      const view = { w: 3, h: 2, pw: 1, ph: 1 };
      /** Точка экрана в пикселях → координаты сцены на глубине 0; px — пикселей в единице сцены. */
      const at = (x: number, y: number) => ({ x: (x / view.pw - 0.5) * 2 * view.w, y: -(y / view.ph - 0.5) * 2 * view.h });
      const px = () => view.ph / (2 * view.h);
      let step: (t: number) => void = () => {};

      if (kind === "scene-orb") {
        // Глянцевая капля: окружение из светящихся полос в цвете акцента даёт блики
        camera.position.set(0, 0, 6);
        const env = new THREE.Scene();
        env.background = light ? new THREE.Color(0xf4f4f4) : new THREE.Color(0x050505);
        const strip = (c: InstanceType<typeof THREE.Color>, k: number, w: number, h: number, p: [number, number, number], ry: number) => {
          const m = new THREE.Mesh(
            new THREE.PlaneGeometry(w, h),
            new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(k), side: THREE.DoubleSide }),
          );
          m.position.set(...p);
          m.rotation.y = ry;
          env.add(m);
        };
        strip(accent, 5, 1.2, 8, [-4, 0, 1], Math.PI / 2);
        strip(accent, 3, 8, 0.6, [0, 3.5, -2], 0);
        strip(new THREE.Color(0xffffff), 3, 2, 3, [4, 1, 2], -Math.PI / 2);
        const pmrem = new THREE.PMREMGenerator(renderer);
        scene.environment = pmrem.fromScene(env, 0.04).texture;
        disposables.push(pmrem);

        const geo = new THREE.SphereGeometry(1, small ? 96 : 160, small ? 72 : 120);
        const base = (geo.attributes.position.array as Float32Array).slice();
        const mat = new THREE.MeshPhysicalMaterial({
          color: light ? accent.clone().lerp(new THREE.Color(0xffffff), 0.15) : accent.clone().multiplyScalar(0.55),
          metalness: light ? 0.85 : 0.7,
          roughness: 0.16,
          clearcoat: 1,
          clearcoatRoughness: 0.08,
        });
        const mesh = new THREE.Mesh(geo, mat);
        scene.add(mesh);
        disposables.push(geo, mat);
        const pos = geo.attributes.position as InstanceType<typeof THREE.BufferAttribute>;
        step = (t) => {
          const a = pos.array as Float32Array;
          for (let i = 0; i < a.length; i += 3) {
            const x = base[i];
            const y = base[i + 1];
            const z = base[i + 2];
            const n =
              Math.sin(x * 2.2 + t * 0.7) * 0.14 + Math.sin(y * 3.1 - t * 0.5 + x) * 0.11 + Math.sin(z * 2.7 + t * 0.9 + y * 1.3) * 0.09;
            a[i] = x * (1 + n);
            a[i + 1] = y * (1 + n);
            a[i + 2] = z * (1 + n);
          }
          pos.needsUpdate = true;
          geo.computeVertexNormals();
          mesh.rotation.set(0.3 + pointer.y * 0.5, t * 0.15 + pointer.x * 0.8, -0.3);
          // Капля у правого края, на уровне заголовка и частично за краем: не спорит с текстом и фото при любой композиции
          const r = Math.min(Math.max(view.pw * (small ? 0.26 : 0.17), 100), 260);
          const c = at(view.pw - r * 0.45, Math.min(view.ph * 0.34, small ? r + 40 : 300));
          mesh.position.set(c.x, c.y, 0);
          mesh.scale.setScalar(r / px());
        };
      } else if (kind === "scene-particles") {
        // Облако частиц: спираль галактики, медленно вращается и наклоняется за курсором
        camera.position.set(0, 0, 9);
        const count = small ? 1400 : 3200;
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          const r = Math.pow(Math.random(), 0.7) * 5;
          const arm = (i % 3) * ((Math.PI * 2) / 3);
          const a = arm + r * 0.9 + (Math.random() - 0.5) * 0.6;
          positions[i * 3] = Math.cos(a) * r;
          positions[i * 3 + 1] = (Math.random() - 0.5) * (1.2 - r * 0.15);
          positions[i * 3 + 2] = Math.sin(a) * r;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({
          color: accent,
          size: small ? 0.05 : 0.04,
          transparent: true,
          opacity: light ? 0.85 : 0.95,
          depthWrite: false,
          blending: light ? THREE.NormalBlending : THREE.AdditiveBlending,
        });
        const points = new THREE.Points(geo, mat);
        points.rotation.x = 0.55;
        scene.add(points);
        disposables.push(geo, mat);
        step = (t) => {
          points.rotation.y = t * 0.06 + pointer.x * 0.5;
          points.rotation.x = 0.55 + pointer.y * 0.3;
          // Облако справа от заголовка, радиусом около трети ширины
          const c = at(view.pw * (small ? 0.6 : 0.72), view.ph * 0.4);
          points.position.set(c.x, c.y, 0);
          points.scale.setScalar(Math.min(view.pw * 0.34, 440) / px() / 5);
        };
      } else {
        // Волна из точек: сетка под углом, по ней бегут мягкие волны
        camera.position.set(0, 2.6, 7);
        camera.lookAt(0, 0, 0);
        const cols = small ? 60 : 110;
        const rows = small ? 34 : 60;
        const positions = new Float32Array(cols * rows * 3);
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const i = (y * cols + x) * 3;
            positions[i] = (x / (cols - 1) - 0.5) * 16;
            positions[i + 2] = (y / (rows - 1) - 0.5) * 9;
          }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({
          color: accent,
          size: small ? 0.06 : 0.045,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
          blending: light ? THREE.NormalBlending : THREE.AdditiveBlending,
        });
        const points = new THREE.Points(geo, mat);
        scene.add(points);
        disposables.push(geo, mat);
        const pos = geo.attributes.position as InstanceType<typeof THREE.BufferAttribute>;
        step = (t) => {
          const a = pos.array as Float32Array;
          for (let i = 0; i < a.length; i += 3) {
            const x = a[i];
            const z = a[i + 2];
            a[i + 1] = Math.sin(x * 0.55 + t * 0.9) * 0.45 + Math.cos(z * 0.7 + t * 0.6) * 0.35 + Math.sin((x + z) * 0.3 - t * 0.4) * 0.25;
          }
          pos.needsUpdate = true;
          points.rotation.y = pointer.x * 0.25;
          camera.position.y = 2.6 - pointer.y * 0.6;
          camera.lookAt(0, 0, 0);
        };
      }

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
      const onMove = (e: PointerEvent) => {
        pointer.tx = e.clientX / window.innerWidth - 0.5;
        pointer.ty = e.clientY / window.innerHeight - 0.5;
      };

      let raf = 0;
      let visible = true;
      const clock = new THREE.Clock();
      const frame = () => {
        pointer.x += (pointer.tx - pointer.x) * 0.05;
        pointer.y += (pointer.ty - pointer.y) * 0.05;
        step(clock.getElapsedTime());
        renderer.render(scene, camera);
        raf = visible ? requestAnimationFrame(frame) : 0;
      };
      const ro = new ResizeObserver(() => {
        resize();
        if (still) {
          step(2);
          renderer.render(scene, camera);
        }
      });
      ro.observe(el);
      resize();
      const io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible && !raf && !still) raf = requestAnimationFrame(frame);
      });
      io.observe(el);
      if (still) {
        step(2);
        renderer.render(scene, camera);
      } else {
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

  return <div ref={host} className={f.scene} data-scene={kind} aria-hidden="true" />;
}
