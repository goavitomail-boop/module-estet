"use client";

import { useEffect, useRef } from "react";
import type * as THREE_NS from "three";
import { onReady, prefersReducedMotion, ScrollTrigger, gsap } from "../motion";

/**
 * 3D-сцена первого экрана: блоки сайта летят из глубины, собираются
 * в страницу и превращаются из фиолетового каркаса в готовый сайт.
 * Курсор поворачивает сборку, прокрутка раскладывает её по слоям.
 */

// Тема сайта в сцене — «кофейня», светлая, чтобы контрастировать с тёмным фоном
const C = {
  bg: "#F4ECE0",
  surface: "#FBF6EE",
  text: "#2E1D14",
  muted: "#6E5949",
  accent: "#A65A1E",
  line: "#E2D4C0",
  violet: "#7C5CFF",
  lime: "#C8FF3D",
};
const DISPLAY = "'Playfair Display Variable', Georgia, serif";
const BODY = "'Manrope Variable', system-ui, sans-serif";
const PX = 220; // пикселей текстуры на единицу сцены

type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;

interface PanelDef {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Слой: насколько панель выступает над основой. */
  z: number;
  solid: Draw;
  wire: Draw;
}

const wireBox =
  (bars: number[][] = []): Draw =>
  (g, w, h) => {
    g.fillStyle = "rgba(124, 92, 255, 0.10)";
    g.strokeStyle = C.violet;
    g.lineWidth = 3;
    g.setLineDash([16, 10]);
    g.beginPath();
    g.roundRect(2, 2, w - 4, h - 4, 14);
    g.fill();
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = "rgba(124, 92, 255, 0.35)";
    for (const [x, y, bw, bh] of bars) {
      g.beginPath();
      g.roundRect(x * w, y * h, bw * w, bh * h, 8);
      g.fill();
    }
  };

function cover(g: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const r = Math.max(w / img.width, h / img.height);
  const iw = img.width * r;
  const ih = img.height * r;
  g.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
}

function makePanels(photo: { img: HTMLImageElement | null }): PanelDef[] {
  return [
    {
      // Основа страницы с панелью браузера
      x: 0,
      y: 0,
      w: 6,
      h: 4.2,
      z: 0,
      solid: (g, w, h) => {
        g.fillStyle = C.bg;
        g.beginPath();
        g.roundRect(0, 0, w, h, 26);
        g.fill();
        g.fillStyle = "#1B1B22";
        g.beginPath();
        g.roundRect(0, 0, w, 66, [26, 26, 0, 0]);
        g.fill();
        ["#3A3A45", "#3A3A45", "#3A3A45"].forEach((c, i) => {
          g.fillStyle = c;
          g.beginPath();
          g.arc(34 + i * 26, 33, 8, 0, Math.PI * 2);
          g.fill();
        });
        g.fillStyle = "#0A0A0D";
        g.beginPath();
        g.roundRect(120, 16, w - 150, 34, 8);
        g.fill();
        g.fillStyle = "#A3A3AD";
        g.font = `500 20px ${BODY}`;
        g.fillText("Прототип: кофейня «Бриошь»", 140, 40);
      },
      wire: (g, w, h) => {
        wireBox()(g, w, h);
        g.strokeStyle = "rgba(124, 92, 255, 0.18)";
        g.lineWidth = 1;
        for (let x = 0; x < w; x += 44) {
          g.beginPath();
          g.moveTo(x, 0);
          g.lineTo(x, h);
          g.stroke();
        }
        for (let y = 0; y < h; y += 44) {
          g.beginPath();
          g.moveTo(0, y);
          g.lineTo(w, y);
          g.stroke();
        }
      },
    },
    {
      // Навигация
      x: 0,
      y: 1.57,
      w: 5.6,
      h: 0.36,
      z: 0.18,
      solid: (g, w, h) => {
        g.fillStyle = C.text;
        g.font = `600 34px ${DISPLAY}`;
        g.textBaseline = "middle";
        g.fillText("Бриошь", 6, h / 2);
        g.fillStyle = C.muted;
        g.font = `600 22px ${BODY}`;
        g.textAlign = "right";
        g.fillText("Меню      О нас      Контакты      +7 927 123-45-67", w - 6, h / 2);
        g.strokeStyle = C.line;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(0, h - 1);
        g.lineTo(w, h - 1);
        g.stroke();
      },
      wire: wireBox([
        [0.02, 0.3, 0.18, 0.4],
        [0.62, 0.35, 0.36, 0.3],
      ]),
    },
    {
      // Заголовок
      x: -1.22,
      y: 0.62,
      w: 3.3,
      h: 1.1,
      z: 0.55,
      solid: (g, w, h) => {
        g.fillStyle = C.text;
        g.font = `600 84px ${DISPLAY}`;
        g.textBaseline = "alphabetic";
        g.fillText("Свежая выпечка", 4, 88);
        g.fillText("и кофе на зерне", 4, 186);
      },
      wire: wireBox([
        [0.03, 0.12, 0.9, 0.32],
        [0.03, 0.56, 0.62, 0.32],
      ]),
    },
    {
      // Подзаголовок
      x: -1.47,
      y: -0.24,
      w: 2.8,
      h: 0.42,
      z: 0.4,
      solid: (g) => {
        g.fillStyle = C.muted;
        g.font = `500 26px ${BODY}`;
        g.fillText("Варим кофе и печём десерты каждое утро.", 4, 34);
        g.fillText("Торты на заказ — за три дня.", 4, 74);
      },
      wire: wireBox([
        [0.03, 0.15, 0.94, 0.25],
        [0.03, 0.6, 0.6, 0.25],
      ]),
    },
    {
      // Кнопка
      x: -2.17,
      y: -0.86,
      w: 1.26,
      h: 0.38,
      z: 0.8,
      solid: (g, w, h) => {
        g.fillStyle = C.accent;
        g.beginPath();
        g.roundRect(0, 0, w, h, 18);
        g.fill();
        g.fillStyle = "#FFFFFF";
        g.font = `700 26px ${BODY}`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText("Заказать торт", w / 2, h / 2 + 1);
      },
      wire: wireBox([[0.15, 0.35, 0.7, 0.3]]),
    },
    {
      // Изображение
      x: 1.56,
      y: 0.3,
      w: 2.3,
      h: 2.05,
      z: 0.35,
      solid: (g, w, h) => {
        g.save();
        g.beginPath();
        g.roundRect(0, 0, w, h, 22);
        g.clip();
        if (photo.img) {
          cover(g, photo.img, w, h);
        } else {
          g.fillStyle = C.surface;
          g.fillRect(0, 0, w, h);
          g.fillStyle = C.accent;
          g.beginPath();
          g.arc(w / 2, h * 0.62, w * 0.34, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = C.text;
          g.beginPath();
          g.arc(w / 2, h * 0.62, w * 0.25, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = "rgba(251, 246, 238, 0.6)";
          g.beginPath();
          g.ellipse(w / 2, h * 0.62, w * 0.11, w * 0.07, 0, 0, Math.PI * 2);
          g.fill();
          g.strokeStyle = "rgba(46, 29, 20, 0.35)";
          g.lineWidth = 6;
          g.lineCap = "round";
          for (const dx of [-0.14, 0, 0.14]) {
            g.beginPath();
            const x = w / 2 + dx * w;
            g.moveTo(x, h * 0.32);
            g.bezierCurveTo(x - 30, h * 0.24, x + 30, h * 0.18, x, h * 0.08);
            g.stroke();
          }
        }
        g.restore();
      },
      wire: (g, w, h) => {
        wireBox()(g, w, h);
        g.strokeStyle = "rgba(124, 92, 255, 0.5)";
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(20, 20);
        g.lineTo(w - 20, h - 20);
        g.moveTo(w - 20, 20);
        g.lineTo(20, h - 20);
        g.stroke();
      },
    },
    ...[
      ["Капучино", "220 ₽"],
      ["Круассан с миндалём", "190 ₽"],
      ["Торт на заказ", "от 2 400 ₽"],
    ].map(
      ([name, price], i): PanelDef => ({
        x: -1.93 + i * 1.93,
        y: -1.55,
        w: 1.8,
        h: 0.82,
        z: 0.25 + i * 0.08,
        solid: (g, w, h) => {
          g.fillStyle = C.surface;
          g.strokeStyle = C.line;
          g.lineWidth = 3;
          g.beginPath();
          g.roundRect(2, 2, w - 4, h - 4, 18);
          g.fill();
          g.stroke();
          g.fillStyle = C.text;
          g.font = `600 28px ${DISPLAY}`;
          g.fillText(name, 22, 62);
          g.fillStyle = C.accent;
          g.font = `700 30px ${BODY}`;
          g.fillText(price, 22, h - 34);
        },
        wire: wireBox([
          [0.08, 0.22, 0.7, 0.18],
          [0.08, 0.62, 0.35, 0.18],
        ]),
      }),
    ),
  ];
}

function rand(seed: number) {
  // Детерминированный генератор, чтобы разлёт был одинаковым при каждом заходе
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function HeroScene({ className, photo }: { className?: string; photo?: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      await Promise.all([
        document.fonts.load(`600 84px ${DISPLAY}`),
        document.fonts.load(`600 26px ${BODY}`),
        document.fonts.load(`700 26px ${BODY}`),
      ]).catch(() => undefined);
      if (disposed) return;
      cleanup = build(THREE, el, photo);
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [photo]);

  return <div ref={host} className={className} aria-hidden="true" />;
}

function build(THREE: typeof THREE_NS, el: HTMLDivElement, photoUrl?: string) {
  const reduced = prefersReducedMotion();
  const canvas = document.createElement("canvas");
  el.appendChild(canvas);
  let renderer: THREE_NS.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  } catch {
    canvas.remove();
    return () => {};
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 16);

  const root = new THREE.Group(); // смещение и масштаб под экран
  const site = new THREE.Group(); // поворот за курсором
  root.add(site);
  scene.add(root);

  // Свечение за сайтом
  const glowTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, "rgba(124, 92, 255, 0.55)");
    grd.addColorStop(0.45, "rgba(124, 92, 255, 0.18)");
    grd.addColorStop(1, "rgba(124, 92, 255, 0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 12),
    new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  glow.position.z = -2;
  site.add(glow);

  // Частицы — «пыль» чертежа в глубине
  const count = 320;
  const pos = new Float32Array(count * 3);
  const rnd = rand(7);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (rnd() - 0.5) * 30;
    pos[i * 3 + 1] = (rnd() - 0.5) * 18;
    pos[i * 3 + 2] = -rnd() * 14 + 2;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({ color: 0x8b70ff, size: 0.045, transparent: true, opacity: 0.7, depthWrite: false }),
  );
  scene.add(dust);

  // Панели сайта
  const photo: { img: HTMLImageElement | null } = { img: null };
  const defs = makePanels(photo);
  const textures: THREE_NS.CanvasTexture[] = [];

  const makeTex = (d: PanelDef, draw: Draw) => {
    const c = document.createElement("canvas");
    c.width = Math.round(d.w * PX);
    c.height = Math.round(d.h * PX);
    const g = c.getContext("2d")!;
    draw(g, c.width, c.height);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    textures.push(t);
    return { tex: t, canvas: c, g };
  };

  const r = rand(42);
  const panels = defs.map((d, i) => {
    const geo = new THREE.PlaneGeometry(d.w, d.h);
    const wire = makeTex(d, d.wire);
    const solid = makeTex(d, d.solid);
    const wireMat = new THREE.MeshBasicMaterial({ map: wire.tex, transparent: true, depthWrite: false });
    const solidMat = new THREE.MeshBasicMaterial({ map: solid.tex, transparent: true, depthWrite: false, opacity: 0 });
    const group = new THREE.Group();
    const wireMesh = new THREE.Mesh(geo, wireMat);
    const solidMesh = new THREE.Mesh(geo, solidMat);
    wireMesh.renderOrder = i * 2;
    solidMesh.renderOrder = i * 2 + 1;
    group.add(wireMesh, solidMesh);
    site.add(group);
    const target = new THREE.Vector3(d.x, d.y, d.z);
    const start = new THREE.Vector3(
      d.x + (r() - 0.5) * 12,
      d.y + (r() - 0.5) * 8,
      d.z - 4 - r() * 8,
    );
    const rot = new THREE.Euler((r() - 0.5) * 2.4, (r() - 0.5) * 2.4, (r() - 0.5) * 1.6);
    return { d, group, wireMat, solidMat, solid, target, start, rot, phase: r() * Math.PI * 2 };
  });

  // Метка «Собрано»
  const badge = (() => {
    const d: PanelDef = { x: 2.45, y: 2.12, w: 1.15, h: 0.36, z: 1.1, solid: () => {}, wire: () => {} };
    const { tex } = makeTex(d, (g, w, h) => {
      g.fillStyle = C.lime;
      g.beginPath();
      g.roundRect(0, 0, w, h, h / 2);
      g.fill();
      g.fillStyle = "#0A0A0D";
      g.font = `700 30px ${BODY}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("Собрано", w / 2, h / 2 + 1);
    });
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(d.w, d.h),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
    );
    m.position.set(d.x, d.y, d.z);
    m.scale.setScalar(0.001);
    m.renderOrder = 100;
    site.add(m);
    return m;
  })();

  if (photoUrl) {
    const img = new Image();
    img.onload = () => {
      photo.img = img;
      const p = panels[5];
      p.solid.g.clearRect(0, 0, p.solid.canvas.width, p.solid.canvas.height);
      p.d.solid(p.solid.g, p.solid.canvas.width, p.solid.canvas.height);
      p.solid.tex.needsUpdate = true;
      requestRender();
    };
    img.src = photoUrl;
  }

  // Состояние
  const state = { explode: 0, assembled: reduced ? 1 : 0 };
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const base = { rx: 0.08, ry: 0.32 };

  const layout = () => {
    const w = el.clientWidth;
    const h = el.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const visH = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    const visW = visH * camera.aspect;
    if (camera.aspect > 1.15) {
      // Широкий экран: сайт справа от заголовка
      const scale = Math.min((visW * 0.47) / 6, (visH * 0.72) / 4.2);
      root.scale.setScalar(scale);
      root.position.set(visW * 0.22, -visH * 0.02, 0);
      base.ry = 0.32;
    } else {
      const scale = Math.min((visW * 0.86) / 6, (visH * 0.8) / 4.2);
      root.scale.setScalar(scale);
      root.position.set(0, 0, 0);
      base.ry = 0.18;
    }
    requestRender();
  };

  const place = (t: number) => {
    for (const p of panels) {
      const k = state.explode;
      const floatZ = reduced ? 0 : Math.sin(t * 0.8 + p.phase) * 0.04;
      if (state.assembled >= 1) {
        p.group.position.set(
          p.target.x * (1 + k * 0.08),
          p.target.y * (1 + k * 0.08),
          p.target.z * (1 + k * 6) + floatZ,
        );
      }
    }
    site.rotation.set(base.rx - mouse.y * 0.16 - state.explode * 0.25, base.ry + mouse.x * 0.28 + state.explode * 0.5, 0);
    dust.rotation.y = t * 0.012;
    dust.position.y = state.explode * 2;
  };

  // Стартовое положение — панели разбросаны в глубине
  if (!reduced) {
    for (const p of panels) {
      p.group.position.copy(p.start);
      p.group.rotation.copy(p.rot);
      p.group.scale.setScalar(0.7);
    }
  } else {
    for (const p of panels) {
      p.group.position.copy(p.target);
      p.wireMat.opacity = 0;
      p.solidMat.opacity = 1;
    }
    badge.scale.setScalar(1);
  }

  let raf = 0;
  let visible = true;
  let renderQueued = false;
  const clock = new THREE.Clock();

  const frame = () => {
    raf = 0;
    const t = clock.getElapsedTime();
    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;
    place(t);
    renderer.render(scene, camera);
    if (!reduced && visible) raf = requestAnimationFrame(frame);
  };
  function requestRender() {
    if (reduced) {
      if (!renderQueued) {
        renderQueued = true;
        requestAnimationFrame(() => {
          renderQueued = false;
          place(0);
          renderer.render(scene, camera);
        });
      }
    } else if (!raf && visible) {
      raf = requestAnimationFrame(frame);
    }
  }

  const ro = new ResizeObserver(layout);
  ro.observe(el);
  layout();

  const triggers: ScrollTrigger[] = [];
  let tl: gsap.core.Timeline | null = null;
  let offReady = () => {};

  if (!reduced) {
    const onMove = (e: PointerEvent) => {
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) requestRender();
    });
    io.observe(el);

    triggers.push(
      ScrollTrigger.create({
        // Раскладка по слоям начинается, когда сцена уходит за верх экрана
        trigger: el,
        start: "top top",
        end: "bottom top",
        scrub: true,
        onUpdate: (self) => (state.explode = self.progress),
      }),
    );

    offReady = onReady(() => {
      tl = gsap.timeline({ delay: 0.15 });
      panels.forEach((p, i) => {
        const at = i * 0.07;
        tl!.to(p.group.position, { x: p.target.x, y: p.target.y, z: p.target.z, duration: 1.7, ease: "expo.inOut" }, at);
        tl!.to(p.group.rotation, { x: 0, y: 0, z: 0, duration: 1.7, ease: "expo.inOut" }, at);
        tl!.to(p.group.scale, { x: 1, y: 1, z: 1, duration: 1.7, ease: "expo.inOut" }, at);
      });
      tl.add(() => {
        state.assembled = 1;
      });
      // Каркас заливается готовым видом чуть раньше, чем последние панели встанут на место
      tl.addLabel("fill", "-=0.35");
      panels.forEach((p, i) => {
        tl!.to(p.wireMat, { opacity: 0, duration: 0.5, ease: "power2.out" }, `fill+=${i * 0.11}`);
        tl!.to(p.solidMat, { opacity: 1, duration: 0.6, ease: "power2.out" }, `fill+=${i * 0.11}`);
      });
      tl.to(badge.scale, { x: 1, y: 1, z: 1, duration: 0.7, ease: "back.out(2.2)" });
    });

    requestRender();

    return () => {
      offReady();
      tl?.kill();
      triggers.forEach((t) => t.kill());
      window.removeEventListener("pointermove", onMove);
      io.disconnect();
      ro.disconnect();
      cancelAnimationFrame(raf);
      textures.forEach((t) => t.dispose());
      glowTex.dispose();
      dustGeo.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }

  requestRender();
  return () => {
    ro.disconnect();
    textures.forEach((t) => t.dispose());
    glowTex.dispose();
    dustGeo.dispose();
    renderer.dispose();
    canvas.remove();
  };
}
