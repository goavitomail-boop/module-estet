import { type Build } from "./kit";

/** Ретро-горы: сетчатые горы бегут навстречу, посередине — долина, на горизонте — полосатое солнце, как в 80-х. */
export const build: Build = (k) => {
  const { THREE } = k;
  k.camera.position.set(0, 2.4, 13);
  k.camera.lookAt(0, 1.6, 0);
  k.scene.fog = new THREE.Fog(k.bg, 14, 36);
  const cols = k.small ? 48 : 80;
  const rows = k.small ? 70 : 120;
  const size = { w: 36, d: 44 };
  const geo = k.keep(new THREE.PlaneGeometry(size.w, size.d, cols, rows));
  geo.rotateX(-Math.PI / 2);
  const base = (geo.attributes.position.array as Float32Array).slice();
  const mat = k.keep(new THREE.MeshBasicMaterial({ color: k.accent, wireframe: true, transparent: true, opacity: k.light ? 0.7 : 0.6 }));
  const land = new THREE.Mesh(geo, mat);
  k.scene.add(land);

  // Солнце: круг с градиентом и прорезями-полосами внизу, нарисованный на canvas
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const g = canvas.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, `#${k.accent.clone().lerp(new THREE.Color(0xffffff), 0.45).getHexString()}`);
  grad.addColorStop(1, `#${k.accent.getHexString()}`);
  g.fillStyle = grad;
  g.beginPath();
  g.arc(128, 128, 124, 0, Math.PI * 2);
  g.fill();
  g.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 6; i++) g.fillRect(0, 150 + i * 18, 256, 3 + i * 1.6);
  const texture = k.keep(new THREE.CanvasTexture(canvas));
  texture.colorSpace = THREE.SRGBColorSpace;
  const sunMat = k.keep(new THREE.MeshBasicMaterial({ map: texture, transparent: true, fog: false, depthWrite: false }));
  const sun = new THREE.Mesh(k.keep(new THREE.PlaneGeometry(9, 9)), sunMat);
  sun.position.set(0, 3.2, -20);
  sun.renderOrder = -1;
  k.scene.add(sun);

  const pos = geo.attributes.position;
  const height = (x: number, z: number) => {
    // Посередине долина, к краям горы выше
    const side = Math.min(1, Math.abs(x) / 9) ** 1.6;
    const n = Math.sin(x * 0.42 + z * 0.31) * Math.cos(z * 0.22 - x * 0.18) + Math.sin(z * 0.13 + x * 0.61) * 0.5;
    return Math.max(0, n + 0.7) * side * 2.6;
  };
  return (t) => {
    const scroll = t * 2.2;
    const a = pos.array as Float32Array;
    for (let i = 0; i < a.length; i += 3) a[i + 1] = height(base[i], base[i + 2] - scroll);
    pos.needsUpdate = true;
    land.rotation.y = k.pointer.x * 0.12;
    k.camera.position.x = k.pointer.x * 1.2;
    k.camera.lookAt(0, 1.6, 0);
  };
};
