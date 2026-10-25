import type { ShaderScene } from "../kit";
import { glsl, tones } from "./common";

/** Шёлк: мягкие складки ткани переливаются на свету. */
const fragment = glsl(/* glsl */ `
float height(vec2 q, float t) {
  float s = q.x + sin(q.y * 1.3 + t * 0.5) * 0.45 + fbm(q * 0.5 + t * 0.08) * 0.8;
  return sin(s * 4.2 + t) * 0.6 + sin(s * 1.7 - t * 0.6 + q.y * 0.8) * 0.4;
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  float t = u_time * 0.5;
  vec2 q = rot(0.55) * p * 1.8;
  float e = 0.004;
  float h = height(q, t);
  float hx = height(q + vec2(e, 0.0), t) - h;
  float hy = height(q + vec2(0.0, e), t) - h;
  vec3 n = normalize(vec3(-hx / e * 0.22, -hy / e * 0.22, 1.0));
  vec3 l = normalize(vec3(-0.6, 0.5, 0.62));
  float diff = clamp(dot(n, l), 0.0, 1.0);
  float spec = pow(clamp(dot(n, normalize(l + vec3(0.0, 0.0, 1.0))), 0.0, 1.0), 28.0);
  float shade = pow(diff, 1.6);
  vec3 deep = mix(u_base.rgb, u_c0.rgb, 0.5);
  vec3 col = mix(deep, u_c1.rgb, shade);
  col += mix(u_c1.rgb, u_c3.rgb, 0.6) * spec * 0.9;
  fragColor = vec4(col, 1.0);
}
`);

export const shader: ShaderScene = { place: "full", make: (p) => ({ fragment, speed: 0.6, uniforms: tones(p) }) };
