"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "../motion";

/**
 * Глянцевая чёрная «жидкая» форма с лаймовыми бликами (three.js).
 * Поверхность медленно переливается, форма поворачивается за курсором.
 */
export function LiquidBlob({ className }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cleanup = () => {};
    let disposed = false;

    (async () => {
      const THREE = await import("three");
      if (disposed) return;
      const reduced = prefersReducedMotion();
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      } catch {
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
      camera.position.set(0, 0, 6);

      // Окружение для отражений: тёмная комната с лаймовой и белой светящимися полосами
      const envScene = new THREE.Scene();
      envScene.background = new THREE.Color(0x020302);
      const strip = (color: number, intensity: number, w: number, h: number, pos: [number, number, number], rotY: number) => {
        const m = new THREE.Mesh(
          new THREE.PlaneGeometry(w, h),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }),
        );
        m.position.set(...pos);
        m.rotation.y = rotY;
        envScene.add(m);
      };
      strip(0xc8ff3d, 6, 1.2, 8, [-4, 0, 1], Math.PI / 2);
      strip(0xc8ff3d, 4, 8, 0.6, [0, 3.5, -2], 0);
      strip(0xffffff, 3, 2, 3, [4, 1, 2], -Math.PI / 2);
      const pmrem = new THREE.PMREMGenerator(renderer);
      const env = pmrem.fromScene(envScene, 0.04).texture;
      scene.environment = env;

      const geo = new THREE.SphereGeometry(1, 160, 120);
      const base = (geo.attributes.position.array as Float32Array).slice();
      const mat = new THREE.MeshPhysicalMaterial({
        color: 0x050605,
        metalness: 0.92,
        roughness: 0.14,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.scale.set(1.9, 0.9, 1);
      scene.add(mesh);

      const rim = new THREE.PointLight(0xc8ff3d, 30, 10);
      rim.position.set(-2.5, 1.5, -1);
      scene.add(rim);

      const pos = geo.attributes.position as InstanceType<typeof THREE.BufferAttribute>;
      const deform = (t: number) => {
        const a = pos.array as Float32Array;
        for (let i = 0; i < a.length; i += 3) {
          const x = base[i];
          const y = base[i + 1];
          const z = base[i + 2];
          const n =
            Math.sin(x * 2.2 + t * 0.7) * 0.16 +
            Math.sin(y * 3.1 - t * 0.5 + x) * 0.12 +
            Math.sin(z * 2.7 + t * 0.9 + y * 1.3) * 0.1;
          const k = 1 + n;
          a[i] = x * k;
          a[i + 1] = y * k;
          a[i + 2] = z * k;
        }
        pos.needsUpdate = true;
        geo.computeVertexNormals();
      };

      const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
      const onMove = (e: PointerEvent) => {
        mouse.tx = e.clientX / window.innerWidth - 0.5;
        mouse.ty = e.clientY / window.innerHeight - 0.5;
      };

      const resize = () => {
        const w = el.clientWidth;
        const h = el.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      const ro = new ResizeObserver(() => {
        resize();
        if (reduced) renderer.render(scene, camera);
      });
      ro.observe(el);
      resize();

      let raf = 0;
      let visible = true;
      const clock = new THREE.Clock();
      const frame = () => {
        const t = clock.getElapsedTime();
        mouse.x += (mouse.tx - mouse.x) * 0.04;
        mouse.y += (mouse.ty - mouse.y) * 0.04;
        deform(t);
        mesh.rotation.set(0.35 + mouse.y * 0.4, t * 0.12 + mouse.x * 0.6, -0.35);
        renderer.render(scene, camera);
        raf = visible ? requestAnimationFrame(frame) : 0;
      };

      if (reduced) {
        deform(0);
        mesh.rotation.set(0.35, 0.4, -0.35);
        renderer.render(scene, camera);
      } else {
        window.addEventListener("pointermove", onMove, { passive: true });
        raf = requestAnimationFrame(frame);
      }
      const io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible && !raf && !reduced) raf = requestAnimationFrame(frame);
      });
      io.observe(el);

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", onMove);
        ro.disconnect();
        io.disconnect();
        geo.dispose();
        mat.dispose();
        env.dispose();
        pmrem.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return <div ref={host} className={className} aria-hidden="true" />;
}
