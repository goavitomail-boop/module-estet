"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "../motion";

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

// Точечная сетка чертежа: под курсором сетка прогибается линзой,
// по полю медленно проходит волна яркости.
const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform vec2 uMouse;
uniform float uTime;
uniform float uDpr;
uniform float uActive;

void main() {
  vec2 p = gl_FragCoord.xy;
  vec2 m = uMouse;
  vec2 d = p - m;
  float r = 220.0 * uDpr;
  float lens = exp(-dot(d, d) / (r * r)) * uActive;
  vec2 q = p - d * lens * 0.35;

  float cell = 28.0 * uDpr;
  vec2 g = mod(q, cell) - cell * 0.5;
  float dotR = (1.0 + lens * 1.6) * uDpr;
  float dotMask = 1.0 - smoothstep(dotR - 0.6 * uDpr, dotR + 0.6 * uDpr, length(g));

  vec2 major = mod(q, cell * 6.0);
  float line = (1.0 - smoothstep(0.0, 1.0 * uDpr, min(major.x, major.y))) * 0.06;

  vec2 uv = p / uRes;
  float wave = 0.5 + 0.5 * sin((uv.x + uv.y) * 4.0 - uTime * 0.35);
  float fade = smoothstep(0.0, 0.55, uv.y) * (1.0 - smoothstep(0.75, 1.0, uv.x * 0.2 + 0.8));

  vec3 violet = vec3(0.486, 0.361, 1.0);
  vec3 lime = vec3(0.784, 1.0, 0.239);
  vec3 col = mix(violet, lime, smoothstep(0.25, 0.9, lens));
  float a = (dotMask * (0.22 + 0.18 * wave + lens * 0.6) + line) * fade;
  gl_FragColor = vec4(col * a, a);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? "shader");
  return sh;
}

/** WebGL-фон первого экрана. Без WebGL остаётся CSS-сетка контейнера. */
export function BlueprintCanvas({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: false });
    if (!gl) return;
    canvas.dataset.ready = "true";

    let program: WebGLProgram;
    try {
      program = gl.createProgram()!;
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(program);
      gl.useProgram(program);
    } catch {
      delete canvas.dataset.ready;
      return;
    }

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const u = {
      res: gl.getUniformLocation(program, "uRes"),
      mouse: gl.getUniformLocation(program, "uMouse"),
      time: gl.getUniformLocation(program, "uTime"),
      dpr: gl.getUniformLocation(program, "uDpr"),
      active: gl.getUniformLocation(program, "uActive"),
    };

    const reduced = prefersReducedMotion();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const target = { x: -9999, y: -9999, active: 0 };
    const mouse = { x: -9999, y: -9999, active: 0 };
    let raf = 0;
    let visible = true;
    const start = performance.now();

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (reduced) draw(0);
    };

    const draw = (t: number) => {
      gl.uniform2f(u.res, canvas.width, canvas.height);
      gl.uniform2f(u.mouse, mouse.x, mouse.y);
      gl.uniform1f(u.time, t);
      gl.uniform1f(u.dpr, dpr);
      gl.uniform1f(u.active, mouse.active);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = () => {
      mouse.x += (target.x - mouse.x) * 0.12;
      mouse.y += (target.y - mouse.y) * 0.12;
      mouse.active += (target.active - mouse.active) * 0.08;
      draw((performance.now() - start) / 1000);
      raf = visible ? requestAnimationFrame(loop) : 0;
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * dpr;
      const y = (rect.height - (e.clientY - rect.top)) * dpr;
      if (mouse.active < 0.01) {
        mouse.x = x;
        mouse.y = y;
      }
      target.x = x;
      target.y = y;
      target.active = e.pointerType === "mouse" ? 1 : 0;
    };
    const onLeave = () => (target.active = 0);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    if (reduced) {
      draw(0);
      return () => ro.disconnect();
    }

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && !document.hidden;
      if (visible && !raf) raf = requestAnimationFrame(loop);
    });
    io.observe(canvas);
    const onVis = () => {
      visible = !document.hidden;
      if (visible && !raf) raf = requestAnimationFrame(loop);
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
