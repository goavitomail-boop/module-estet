import type { ShaderScene } from "../kit";
import { glsl, tones } from "./common";

/** Точечная волна: сетка точек, которые растут и сжимаются волнами, как в полиграфии. */
const fragment = glsl(/* glsl */ `
void main() {
  vec2 px = gl_FragCoord.xy / u_pixelRatio;
  float cell = 14.0;
  vec2 c = (floor(px / cell) + 0.5) * cell;
  vec2 uv = c * u_pixelRatio / u_resolution;
  float t = u_time * 0.3;
  float v = fbm(uv * vec2(2.5, 1.8) + vec2(t * 0.4, t * 0.2)) * 0.9 + 0.5 + 0.35 * sin(uv.x * 6.0 - t * 2.0 + uv.y * 3.0);
  v = clamp(v * smoothstep(0.05, 0.75, uv.x), 0.0, 1.0);
  float r = v * cell * 0.45;
  float a = smoothstep(r, r - 1.0, length(px - c));
  vec3 col = mix(u_c1.rgb, u_c3.rgb, v);
  fragColor = vec4(col * a, a);
}
`);

export const shader: ShaderScene = { place: "full", make: (p) => ({ fragment, speed: 1, uniforms: tones(p) }) };
