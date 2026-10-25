import { atEdge, metal, studio, type Build } from "./kit";

/** Гироскоп: три металлических кольца вращаются в разных плоскостях вокруг глянцевого ядра. */
export const build: Build = (k) => {
  const { THREE } = k;
  studio(k);
  const group = new THREE.Group();
  const ringMat = k.keep(
    new THREE.MeshPhysicalMaterial({ color: metal(k), metalness: 0.9, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1 }),
  );
  const rings = [1, 0.78, 0.58].map((r, i) => {
    const geo = k.keep(new THREE.TorusGeometry(r, 0.055 - i * 0.008, k.small ? 16 : 24, k.small ? 96 : 180));
    const mesh = new THREE.Mesh(geo, ringMat);
    group.add(mesh);
    return mesh;
  });
  const coreMat = k.keep(new THREE.MeshPhysicalMaterial({ color: k.accent, metalness: 0.3, roughness: 0.1, clearcoat: 1 }));
  const core = new THREE.Mesh(k.keep(new THREE.SphereGeometry(0.2, 48, 32)), coreMat);
  group.add(core);
  k.scene.add(group);
  return (t) => {
    rings[0].rotation.set(t * 0.45, t * 0.3, 0);
    rings[1].rotation.set(1.2, t * 0.55 + 1, t * 0.35);
    rings[2].rotation.set(t * 0.65 + 2, 0.4, t * 0.5);
    core.scale.setScalar(1 + Math.sin(t * 2) * 0.06);
    group.rotation.set(0.35 + k.pointer.y * 0.6, k.pointer.x * 0.8, 0.2);
    atEdge(k, group, { size: 0.16, inset: 0.5 });
  };
};
