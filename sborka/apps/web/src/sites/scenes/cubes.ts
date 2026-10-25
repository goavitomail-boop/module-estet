import { type Build } from "./kit";

/** Кубы: поле из кубиков внизу экрана поднимается волнами, под курсором вырастает холм. */
export const build: Build = (k) => {
  const { THREE } = k;
  const cols = k.small ? 18 : 34;
  const rows = k.small ? 10 : 14;
  k.camera.position.set(0, 14, 24);
  k.camera.lookAt(0, 0, -1);
  k.scene.add(new THREE.HemisphereLight(0xffffff, k.light ? 0xbbbbbb : 0x222222, k.light ? 1.6 : 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-4, 8, 6);
  k.scene.add(sun);
  const geo = k.keep(new THREE.BoxGeometry(0.86, 1, 0.86));
  geo.translate(0, 0.5, 0);
  const mat = k.keep(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.1 }));
  const cubes = k.keep(new THREE.InstancedMesh(geo, mat, cols * rows));
  k.scene.add(cubes);
  const m = new THREE.Matrix4();
  const color = new THREE.Color();
  const low = k.accent.clone().lerp(new THREE.Color(k.light ? 0xffffff : 0x000000), k.light ? 0.55 : 0.6);
  return (t) => {
    // Курсор над полем: где он, там холм
    const hx = k.pointer.x * cols;
    const hz = (k.pointer.y + 0.2) * rows;
    for (let z = 0; z < rows; z++) {
      for (let x = 0; x < cols; x++) {
        const px = x - (cols - 1) / 2;
        const pz = z - (rows - 1) / 2;
        const d = (px - hx) ** 2 + (pz - hz) ** 2;
        const h = 0.6 + (Math.sin(px * 0.45 + t * 1.1) + Math.cos(pz * 0.55 + t * 0.8)) * 0.3 + Math.exp(-d / 6) * 1.4;
        const i = z * cols + x;
        cubes.setMatrixAt(i, m.makeScale(1, h, 1).setPosition(px, 0, pz));
        cubes.setColorAt(i, color.copy(low).lerp(k.accent, Math.min(1, (h - 0.3) / 2)));
      }
    }
    cubes.instanceMatrix.needsUpdate = true;
    if (cubes.instanceColor) cubes.instanceColor.needsUpdate = true;
  };
};
