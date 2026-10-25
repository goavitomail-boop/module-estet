import { studio, type Build } from "./kit";

/** Двойная спираль, как ДНК: две нити бусин с перемычками вращаются у правого края, слегка наклонены. */
export const build: Build = (k) => {
  const { THREE } = k;
  studio(k);
  const pairs = k.small ? 18 : 30;
  const height = 4;
  const sphere = k.keep(new THREE.SphereGeometry(0.11, 24, 16));
  const strandA = k.keep(new THREE.MeshPhysicalMaterial({ color: k.accent, roughness: 0.15, clearcoat: 1 }));
  const strandB = k.keep(
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(k.light ? 0xffffff : 0xf2f2ee).lerp(k.accent, 0.15),
      roughness: 0.2,
      clearcoat: 1,
    }),
  );
  const a = k.keep(new THREE.InstancedMesh(sphere, strandA, pairs));
  const b = k.keep(new THREE.InstancedMesh(sphere, strandB, pairs));
  const rungs = new Float32Array(pairs * 6);
  const rungGeo = k.keep(new THREE.BufferGeometry());
  rungGeo.setAttribute("position", new THREE.BufferAttribute(rungs, 3));
  const rungMat = k.keep(new THREE.LineBasicMaterial({ color: k.accent, transparent: true, opacity: 0.45 }));
  const lines = new THREE.LineSegments(rungGeo, rungMat);
  const group = new THREE.Group();
  group.add(a, b, lines);
  k.scene.add(group);
  const m = new THREE.Matrix4();
  const radius = 0.55;
  for (let i = 0; i < pairs; i++) {
    const y = (i / (pairs - 1) - 0.5) * height;
    const angle = i * 0.42;
    const ax = Math.cos(angle) * radius;
    const az = Math.sin(angle) * radius;
    a.setMatrixAt(i, m.makeTranslation(ax, y, az));
    b.setMatrixAt(i, m.makeTranslation(-ax, y, -az));
    rungs.set([ax, y, az, -ax, y, -az], i * 6);
  }
  return (t) => {
    group.rotation.set(k.pointer.y * 0.3, t * 0.45 + k.pointer.x * 0.8, 0.32);
    // Спираль почти во всю высоту первого экрана, у правого края
    const c = k.at(k.view.pw - Math.min(k.view.pw * (k.small ? 0.16 : 0.12), 170), k.view.ph * (k.small ? 0.3 : 0.45));
    group.position.set(c.x, c.y, 0);
    group.scale.setScalar((k.view.ph * (k.small ? 0.5 : 0.85)) / height / k.px());
  };
};
