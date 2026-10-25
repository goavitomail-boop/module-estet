import { glow, type Build } from "./kit";

/** Волна из точек: сетка под углом внизу экрана, по ней бегут мягкие волны. */
export const build: Build = (k) => {
  const { THREE } = k;
  k.camera.position.set(0, 2.6, 7);
  k.camera.lookAt(0, 0, 0);
  const cols = k.small ? 60 : 110;
  const rows = k.small ? 34 : 60;
  const positions = new Float32Array(cols * rows * 3);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 3;
      positions[i] = (x / (cols - 1) - 0.5) * 16;
      positions[i + 2] = (y / (rows - 1) - 0.5) * 9;
    }
  }
  const geo = k.keep(new THREE.BufferGeometry());
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = k.keep(
    new THREE.PointsMaterial({
      color: k.accent,
      size: k.small ? 0.06 : 0.045,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: glow(k),
    }),
  );
  const points = new THREE.Points(geo, mat);
  k.scene.add(points);
  const pos = geo.attributes.position;
  return (t) => {
    const a = pos.array as Float32Array;
    for (let i = 0; i < a.length; i += 3) {
      const x = a[i];
      const z = a[i + 2];
      a[i + 1] = Math.sin(x * 0.55 + t * 0.9) * 0.45 + Math.cos(z * 0.7 + t * 0.6) * 0.35 + Math.sin((x + z) * 0.3 - t * 0.4) * 0.25;
    }
    pos.needsUpdate = true;
    points.rotation.y = k.pointer.x * 0.25;
    k.camera.position.y = 2.6 - k.pointer.y * 0.6;
    k.camera.lookAt(0, 0, 0);
  };
};
