import { studio, type Build } from "./kit";

/**
 * Парящие фигуры: шары, кубы, кольца и пирамидки в цветах сайта плывут в невесомости справа;
 * ближние сильнее сдвигаются за курсором — получается объём.
 */
export const build: Build = (k) => {
  const { THREE } = k;
  studio(k);
  const light = new THREE.DirectionalLight(0xffffff, 1.2);
  light.position.set(3, 4, 5);
  k.scene.add(light);
  const colors = [
    k.accent,
    new THREE.Color(k.light ? 0xffffff : 0xf2f2ee),
    k.accent.clone().lerp(new THREE.Color(k.light ? 0x111111 : 0xffffff), 0.45),
  ];
  const mats = colors.map((c, i) =>
    k.keep(new THREE.MeshPhysicalMaterial({ color: c, roughness: i === 1 ? 0.35 : 0.18, metalness: i === 2 ? 0.6 : 0.05, clearcoat: 1 })),
  );
  const geos = [
    new THREE.SphereGeometry(1, 40, 28),
    new THREE.BoxGeometry(1.4, 1.4, 1.4),
    new THREE.TorusGeometry(0.8, 0.32, 24, 64),
    new THREE.ConeGeometry(0.95, 1.6, 4),
    new THREE.IcosahedronGeometry(1, 0),
  ].map((g) => k.keep(g));
  const count = k.small ? 6 : 12;
  // Случайно, но одинаково при каждой загрузке
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const items = Array.from({ length: count }, (_, i) => {
    const mesh = new THREE.Mesh(geos[i % geos.length], mats[i % mats.length]);
    mesh.rotation.set(rand() * 6, rand() * 6, 0);
    k.scene.add(mesh);
    return {
      mesh,
      // Справа от заголовка: при любой композиции текст левее или по центру
      x: (k.small ? 0.55 : 0.74) + rand() * (k.small ? 0.43 : 0.26),
      y: 0.08 + rand() * (k.small ? 0.35 : 0.8),
      z: rand(),
      r: (k.small ? 12 : 16) + rand() * (k.small ? 18 : 30),
      spin: 0.2 + rand() * 0.5,
      phase: rand() * 6,
    };
  });
  return (t) => {
    for (const it of items) {
      const depth = 0.4 + it.z;
      const c = k.at(
        k.view.pw * it.x + Math.sin(t * 0.3 + it.phase) * 14 + k.pointer.x * 50 * depth,
        k.view.ph * it.y + Math.sin(t * 0.6 + it.phase) * 16 + k.pointer.y * 36 * depth,
      );
      it.mesh.position.set(c.x, c.y, (it.z - 0.5) * 2);
      it.mesh.scale.setScalar((it.r * depth) / k.px());
      it.mesh.rotation.x += 0.003 * it.spin * 3;
      it.mesh.rotation.y += 0.004 * it.spin * 3;
    }
  };
};
