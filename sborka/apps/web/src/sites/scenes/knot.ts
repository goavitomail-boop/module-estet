import { atEdge, metal, studio, type Build } from "./kit";

/** Бесконечный узел: глянцевая трубка завязана в узел и медленно поворачивается. */
export const build: Build = (k) => {
  const { THREE } = k;
  studio(k);
  const geo = k.keep(new THREE.TorusKnotGeometry(0.68, 0.24, k.small ? 160 : 300, k.small ? 18 : 32, 2, 3));
  const mat = k.keep(
    new THREE.MeshPhysicalMaterial({ color: metal(k), metalness: 0.8, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.06 }),
  );
  const knot = new THREE.Mesh(geo, mat);
  k.scene.add(knot);
  return (t) => {
    knot.rotation.set(0.4 + t * 0.12 + k.pointer.y * 0.6, t * 0.2 + k.pointer.x * 0.9, t * 0.05);
    atEdge(k, knot, { size: 0.17, inset: 0.45 });
  };
};
