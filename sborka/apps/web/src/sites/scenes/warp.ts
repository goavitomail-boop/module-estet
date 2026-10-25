import { glow, type Build } from "./kit";

/** Гиперпрыжок: звёзды-штрихи летят навстречу, точка схода смещается за курсором. */
export const build: Build = (k) => {
  const { THREE } = k;
  k.camera.position.set(0, 0, 0);
  const count = k.small ? 320 : 700;
  const depth = 60;
  const stars = new Float32Array(count * 4); // x, y, z, скорость
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 0.6 + Math.pow(Math.random(), 0.6) * 9;
    stars.set([Math.cos(a) * r, Math.sin(a) * r, -Math.random() * depth, 0.6 + Math.random() * 0.8], i * 4);
  }
  const positions = new Float32Array(count * 6);
  const geo = k.keep(new THREE.BufferGeometry());
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = k.keep(new THREE.LineBasicMaterial({ color: k.accent, transparent: true, opacity: k.light ? 0.7 : 0.85, blending: glow(k) }));
  k.scene.add(new THREE.LineSegments(geo, mat));
  let last = 0;
  return (t) => {
    const dt = Math.min(0.05, Math.max(0, t - last));
    last = t;
    for (let i = 0; i < count; i++) {
      const o = i * 4;
      stars[o + 2] += stars[o + 3] * dt * 9;
      if (stars[o + 2] > -0.5) stars[o + 2] -= depth;
      const z = stars[o + 2];
      const tail = 0.6 + stars[o + 3] * 1.4;
      positions.set([stars[o], stars[o + 1], z, stars[o], stars[o + 1], z - tail], i * 6);
    }
    geo.attributes.position.needsUpdate = true;
    k.camera.rotation.set(-k.pointer.y * 0.18, -k.pointer.x * 0.25, 0);
  };
};
