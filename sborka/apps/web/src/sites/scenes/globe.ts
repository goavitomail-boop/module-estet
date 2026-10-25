import type * as T from "three";
import { atEdge, glow, type Build } from "./kit";

/** Глобус из точек: равномерная сетка точек на сфере и светящиеся маршруты-дуги между городами. */
export const build: Build = (k) => {
  const { THREE } = k;
  const group = new THREE.Group();
  // Точки по спирали Фибоначчи — ровно по всей сфере
  const count = k.small ? 1100 : 2600;
  const dots = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    dots.set([Math.cos(i * golden) * r, y, Math.sin(i * golden) * r], i * 3);
  }
  const dotGeo = k.keep(new THREE.BufferGeometry());
  dotGeo.setAttribute("position", new THREE.BufferAttribute(dots, 3));
  const dotMat = k.keep(
    // Размер точек в пикселях: глобус масштабируется под экран, а точки остаются чёткими
    new THREE.PointsMaterial({
      color: k.accent,
      size: k.small ? 2.2 : 2.6,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: glow(k),
    }),
  );
  group.add(new THREE.Points(dotGeo, dotMat));
  // Невидимая сфера внутри закрывает точки на обратной стороне
  const coreMat = k.keep(new THREE.MeshBasicMaterial({ colorWrite: false }));
  const core = new THREE.Mesh(k.keep(new THREE.SphereGeometry(0.985, 48, 32)), coreMat);
  core.renderOrder = -1;
  group.add(core);
  // Маршруты: дуги над поверхностью, по каждой бежит светящийся отрезок
  const arcMat = k.keep(new THREE.LineBasicMaterial({ color: k.accent, transparent: true, opacity: 0.95, blending: glow(k) }));
  const arcs: { line: T.Line; speed: number; phase: number }[] = [];
  let seed = 11;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const onSphere = () => {
    const u = rand() * 2 - 1;
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    return new THREE.Vector3(Math.cos(a) * r, u * 0.8, Math.sin(a) * r).normalize();
  };
  for (let i = 0; i < (k.small ? 5 : 9); i++) {
    const from = onSphere();
    const to = onSphere();
    const mid = from
      .clone()
      .add(to)
      .normalize()
      .multiplyScalar(1 + from.distanceTo(to) * 0.45);
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const geo = k.keep(new THREE.BufferGeometry().setFromPoints(curve.getPoints(80)));
    const line = new THREE.Line(geo, arcMat);
    group.add(line);
    arcs.push({ line, speed: 0.25 + rand() * 0.2, phase: rand() });
  }
  k.scene.add(group);
  return (t) => {
    for (const arc of arcs) {
      const p = (t * arc.speed + arc.phase) % 1.5;
      const head = Math.floor(Math.min(p, 1) * 81);
      const tail = Math.max(0, Math.floor((p - 0.35) * 81));
      arc.line.geometry.setDrawRange(tail, Math.max(0, head - tail));
    }
    group.rotation.set(0.35 + k.pointer.y * 0.4, t * 0.1 + k.pointer.x * 0.8, 0.2);
    atEdge(k, group, { size: 0.24, max: 340, inset: 0.35 });
  };
};
