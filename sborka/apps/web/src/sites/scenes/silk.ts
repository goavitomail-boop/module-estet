import type * as T from "three";
import { metal, studio, type Build } from "./kit";

/**
 * Шёлковые ленты: две глянцевые ленты внизу справа изгибаются и закручиваются, как ткань на ветру.
 * Свет сбоку даёт переливы на изгибах.
 */
export const build: Build = (k) => {
  const { THREE } = k;
  studio(k);
  k.scene.add(new THREE.AmbientLight(0xffffff, k.light ? 0.6 : 0.25));
  const sun = new THREE.DirectionalLight(0xffffff, k.light ? 1.4 : 2.2);
  sun.position.set(-3, 4, 5);
  k.scene.add(sun);
  const length = 12;
  const make = (color: T.Color, width: number, phase: number, lift: number) => {
    const geo = k.keep(new THREE.PlaneGeometry(length, width, k.small ? 120 : 260, k.small ? 6 : 10));
    const mat = k.keep(
      new THREE.MeshPhysicalMaterial({
        color,
        metalness: 0.3,
        roughness: 0.3,
        sheen: 1,
        sheenColor: k.accent.clone().lerp(new THREE.Color(0xffffff), 0.6),
        sheenRoughness: 0.3,
        clearcoat: 0.8,
        clearcoatRoughness: 0.2,
        side: THREE.DoubleSide,
      }),
    );
    const mesh = new THREE.Mesh(geo, mat);
    return { mesh, geo, base: (geo.attributes.position.array as Float32Array).slice(), phase, lift };
  };
  const ribbons = [
    make(metal(k), 0.9, 0, 0),
    make(k.accent.clone().lerp(new THREE.Color(k.light ? 0xffffff : 0x000000), k.light ? 0.5 : 0.35), 0.6, 2.1, 0.45),
  ];
  const group = new THREE.Group();
  ribbons.forEach((r) => group.add(r.mesh));
  k.scene.add(group);
  return (t) => {
    for (const r of ribbons) {
      const a = r.geo.attributes.position.array as Float32Array;
      for (let i = 0; i < a.length; i += 3) {
        const x = r.base[i];
        const y = r.base[i + 1];
        // Лента закручивается вдоль длины, и по ней бегут волны
        const twist = x * 0.42 + Math.sin(t * 0.4 + x * 0.25 + r.phase) * 1.3;
        const wave = Math.sin(x * 0.5 + t * 0.75 + r.phase) * 0.6 + Math.sin(x * 1.1 - t * 0.5) * 0.15;
        a[i + 1] = y * Math.cos(twist) + wave + r.lift;
        a[i + 2] = y * Math.sin(twist) + Math.cos(x * 0.38 + t * 0.6 + r.phase) * 0.6;
      }
      r.geo.attributes.position.needsUpdate = true;
      r.geo.computeVertexNormals();
    }
    const c = k.at(k.view.pw * (k.small ? 0.55 : 0.66), k.view.ph * (k.small ? 0.84 : 0.7));
    group.position.set(c.x, c.y, 0);
    group.scale.setScalar((k.view.pw * (k.small ? 1.2 : 0.9)) / length / k.px());
    group.rotation.set(0.25 + k.pointer.y * 0.3, -0.25 + k.pointer.x * 0.4, 0.28);
  };
};
