import type * as T from "three";
import { studio, type Build } from "./kit";

/**
 * Стеклянные фигуры: прозрачные кольцо, многогранники и шар парят у правого края, частично за ним;
 * сквозь стекло видны глянцевые бусины в цвете акцента.
 * Места заданы в долях окна, размер — в пикселях: композиция одинаковая на любом экране.
 */
const DESKTOP: [number, number, number, number][] = [
  // x, y, радиус в px, какая фигура
  [0.86, 0.12, 46, 1],
  [0.97, 0.3, 80, 0],
  [0.84, 0.46, 40, 3],
  [0.96, 0.66, 92, 2],
  [0.85, 0.84, 44, 4],
];
const PHONE: [number, number, number, number][] = [
  [0.72, 0.1, 34, 0],
  [0.92, 0.22, 46, 2],
  [0.8, 0.36, 30, 3],
];

export const build: Build = (k) => {
  const { THREE } = k;
  studio(k);
  if (k.small) k.renderer.transmissionResolutionScale = 0.5;
  // На светлом фоне прозрачное стекло пропало бы — там оно гуще окрашено и с радужной плёнкой по краям
  const glass = k.keep(
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xffffff).lerp(k.accent, k.light ? 0.45 : 0.2),
      metalness: 0,
      roughness: k.light ? 0.1 : 0.06,
      transmission: 1,
      thickness: 1.2,
      ior: 1.5,
      attenuationColor: k.accent,
      attenuationDistance: k.light ? 0.7 : 2.5,
      iridescence: k.light ? 0.7 : 0.3,
      iridescenceIOR: 1.4,
      clearcoat: 1,
    }),
  );
  const geos = [
    new THREE.TorusGeometry(0.62, 0.3, 32, 96),
    new THREE.IcosahedronGeometry(0.95, 0),
    new THREE.SphereGeometry(0.9, 64, 48),
    new THREE.OctahedronGeometry(1, 0),
    new THREE.ConeGeometry(0.75, 1.4, 48),
  ].map((g) => k.keep(g));
  const place = k.small ? PHONE : DESKTOP;
  const items = place.map(([x, y, r, shape], i) => {
    const mesh = new THREE.Mesh(geos[shape], glass);
    mesh.rotation.set(i, i * 0.7, 0);
    k.scene.add(mesh);
    return { mesh, x, y, r, phase: i * 1.7 };
  });
  // Непрозрачные бусины, которые преломляет стекло
  const beadMat = k.keep(new THREE.MeshPhysicalMaterial({ color: k.accent, roughness: 0.15, clearcoat: 1 }));
  const beadGeo = k.keep(new THREE.SphereGeometry(1, 32, 24));
  const beads: { mesh: T.Mesh; x: number; y: number; r: number; phase: number }[] = (
    k.small
      ? [[0.84, 0.28, 14]]
      : [
          [0.92, 0.22, 20],
          [0.9, 0.58, 16],
        ]
  ).map(([x, y, r], i) => {
    const mesh = new THREE.Mesh(beadGeo, beadMat);
    mesh.position.z = -1.2;
    k.scene.add(mesh);
    return { mesh, x, y, r, phase: i * 2.3 + 1 };
  });
  return (t) => {
    for (const it of [...items, ...beads]) {
      const depth = it.mesh.position.z < 0 ? 0.5 : 1;
      const c = k.at(
        k.view.pw * it.x + k.pointer.x * 30 * depth,
        k.view.ph * it.y + Math.sin(t * 0.8 + it.phase) * 10 + k.pointer.y * 20 * depth,
      );
      it.mesh.position.x = c.x;
      it.mesh.position.y = c.y;
      it.mesh.scale.setScalar(it.r / k.px());
    }
    for (const it of items) {
      it.mesh.rotation.x += 0.004;
      it.mesh.rotation.y += 0.006;
    }
  };
};
