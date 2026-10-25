import { atEdge, metal, studio, type Build } from "./kit";

/** Глянцевая капля: сфера медленно перетекает, блики дают полосы окружения в цвете акцента. */
export const build: Build = (k) => {
  const { THREE } = k;
  studio(k);
  const geo = k.keep(new THREE.SphereGeometry(1, k.small ? 96 : 160, k.small ? 72 : 120));
  const base = (geo.attributes.position.array as Float32Array).slice();
  const mat = k.keep(
    new THREE.MeshPhysicalMaterial({
      color: metal(k),
      metalness: k.light ? 0.85 : 0.7,
      roughness: 0.16,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    }),
  );
  const mesh = new THREE.Mesh(geo, mat);
  k.scene.add(mesh);
  const pos = geo.attributes.position;
  return (t) => {
    const a = pos.array as Float32Array;
    for (let i = 0; i < a.length; i += 3) {
      const x = base[i];
      const y = base[i + 1];
      const z = base[i + 2];
      const n = Math.sin(x * 2.2 + t * 0.7) * 0.14 + Math.sin(y * 3.1 - t * 0.5 + x) * 0.11 + Math.sin(z * 2.7 + t * 0.9 + y * 1.3) * 0.09;
      a[i] = x * (1 + n);
      a[i + 1] = y * (1 + n);
      a[i + 2] = z * (1 + n);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    mesh.rotation.set(0.3 + k.pointer.y * 0.5, t * 0.15 + k.pointer.x * 0.8, -0.3);
    atEdge(k, mesh);
  };
};
