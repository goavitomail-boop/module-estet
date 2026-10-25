import { glow, type Build } from "./kit";

/** Струны: десятки тонких линий текут волной под углом, как звук или шёлковые нити. */
export const build: Build = (k) => {
  const { THREE } = k;
  const lines = k.small ? 26 : 44;
  const points = k.small ? 90 : 160;
  const group = new THREE.Group();
  const width = 14;
  const strings = Array.from({ length: lines }, (_, i) => {
    const positions = new Float32Array(points * 3);
    const geo = k.keep(new THREE.BufferGeometry());
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    // Крайние линии бледнее — набор выглядит объёмной лентой
    const edge = Math.abs(i / (lines - 1) - 0.5) * 2;
    const mat = k.keep(new THREE.LineBasicMaterial({ color: k.accent, transparent: true, opacity: 0.85 - edge * 0.6, blending: glow(k) }));
    const line = new THREE.Line(geo, mat);
    group.add(line);
    return { positions, geo, offset: (i - lines / 2) * 0.07 };
  });
  k.scene.add(group);
  return (t) => {
    for (const s of strings) {
      for (let j = 0; j < points; j++) {
        const u = j / (points - 1);
        const x = (u - 0.5) * width;
        // Посередине волна сильнее, к краям затихает
        const env = Math.sin(u * Math.PI);
        const y = (Math.sin(x * 0.45 + t * 0.8 + s.offset * 3) * 0.8 + Math.sin(x * 0.9 - t * 0.6 + s.offset * 5) * 0.25) * env;
        s.positions.set([x, y + s.offset * 0.6, s.offset * 2], j * 3);
      }
      s.geo.attributes.position.needsUpdate = true;
    }
    const c = k.at(k.view.pw * 0.5, k.view.ph * (k.small ? 0.8 : 0.66));
    group.position.set(c.x, c.y, 0);
    group.scale.setScalar((k.view.pw * 1.05) / width / k.px());
    group.rotation.set(-0.55 + k.pointer.y * 0.3, k.pointer.x * 0.4, -0.12);
  };
};
