import type { ShaderScene } from "../kit";
import { glsl, tones } from "./common";

/** Лучи: мягкие косые лучи света медленно скользят по экрану. */
const fragment = glsl(/* glsl */ `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = rot(0.6) * (gl_FragCoord.xy / u_resolution.y);
  float t = u_time * 0.15;
  float n = fbm(vec2(p.x * 0.8, t)) * 1.5;
  float b = pow(0.5 + 0.5 * sin(p.x * 5.0 + n * 3.0 + t), 4.0);
  float flicker = 0.7 + 0.3 * fbm(vec2(p.x * 3.0, p.y * 0.3 + t * 2.0));
  float a = clamp(b * flicker * 1.3 * smoothstep(0.0, 0.5, uv.x + 0.2), 0.0, 1.0) * (u_dark > 0.5 ? 0.9 : 0.7);
  vec3 col = mix(u_c3.rgb, u_c1.rgb, 0.3);
  fragColor = vec4(col * a, a);
}
`);

export const shader: ShaderScene = { place: "full", make: (p) => ({ fragment, speed: 0.8, uniforms: tones(p) }) };
