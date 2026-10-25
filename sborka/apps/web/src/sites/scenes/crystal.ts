import type * as T from "three";
import { atEdge, studio, type Build } from "./kit";

/** Кристалл: гранёный многогранник с радужными бликами, контур из линий и осколки на орбите. */
export const build: Build = (k) => {
  const { THREE } = k;
  studio(k);
  const group = new THREE.Group();
  const mat = k.keep(
    new THREE.MeshPhysicalMaterial({
      color: k.light ? new THREE.Color(0xffffff).lerp(k.accent, 0.4) : k.accent.clone().lerp(new THREE.Color(0xffffff), 0.2),
      metalness: 0.15,
      roughness: 0.05,
      clearcoat: 1,
      iridescence: 1,
      iridescenceIOR: 1.6,
      iridescenceThicknessRange: [180, 720],
      flatShading: true,
    }),
  );
  const geo = k.keep(new THREE.IcosahedronGeometry(0.62, 0));
  const gem = new THREE.Mesh(geo, mat);
  group.add(gem);
  const edges = k.keep(new THREE.EdgesGeometry(geo));
  const lineMat = k.keep(new THREE.LineBasicMaterial({ color: k.accent, transparent: true, opacity: 0.7 }));
  const outline = new THREE.LineSegments(edges, lineMat);
  outline.scale.setScalar(1.14);
  group.add(outline);
  const shardGeo = k.keep(new THREE.OctahedronGeometry(0.09, 0));
  const shards: { mesh: T.Mesh; r: number; speed: number; phase: number; tilt: number }[] = [];
  for (let i = 0; i < (k.small ? 5 : 8); i++) {
    const mesh = new THREE.Mesh(shardGeo, mat);
    group.add(mesh);
    shards.push({
      mesh,
      r: 0.9 + (i % 3) * 0.08,
      speed: 0.35 + (i % 4) * 0.08,
      phase: (i / 8) * Math.PI * 2,
      tilt: (i % 2 ? 1 : -1) * 0.5,
    });
  }
  k.scene.add(group);
  return (t) => {
    gem.rotation.set(t * 0.25, t * 0.35, 0);
    outline.rotation.copy(gem.rotation);
    for (const s of shards) {
      const a = s.phase + t * s.speed;
      s.mesh.position.set(Math.cos(a) * s.r, Math.sin(a) * s.r * s.tilt, Math.sin(a) * s.r);
      s.mesh.rotation.set(t, t * 1.3, 0);
    }
    group.rotation.set(0.25 + k.pointer.y * 0.5, k.pointer.x * 0.8, 0);
    atEdge(k, group, { size: 0.2, max: 300, inset: 0.55 });
  };
};
