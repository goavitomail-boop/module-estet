import { glow, type Build } from "./kit";

/** Облако частиц: спираль галактики справа от заголовка, вращается и наклоняется за курсором. */
export const build: Build = (k) => {
  const { THREE } = k;
  k.camera.position.set(0, 0, 9);
  const count = k.small ? 1400 : 3200;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = Math.pow(Math.random(), 0.7) * 5;
    const arm = (i % 3) * ((Math.PI * 2) / 3);
    const a = arm + r * 0.9 + (Math.random() - 0.5) * 0.6;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = (Math.random() - 0.5) * (1.2 - r * 0.15);
    positions[i * 3 + 2] = Math.sin(a) * r;
  }
  const geo = k.keep(new THREE.BufferGeometry());
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = k.keep(
    new THREE.PointsMaterial({
      color: k.accent,
      size: k.small ? 0.05 : 0.04,
      transparent: true,
      opacity: k.light ? 0.85 : 0.95,
      depthWrite: false,
      blending: glow(k),
    }),
  );
  const points = new THREE.Points(geo, mat);
  k.scene.add(points);
  return (t) => {
    points.rotation.y = t * 0.06 + k.pointer.x * 0.5;
    points.rotation.x = 0.55 + k.pointer.y * 0.3;
    const c = k.at(k.view.pw * (k.small ? 0.6 : 0.72), k.view.ph * 0.4);
    points.position.set(c.x, c.y, 0);
    points.scale.setScalar(Math.min(k.view.pw * 0.34, 440) / k.px() / 5);
  };
};
