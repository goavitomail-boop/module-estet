import type { ShaderScene } from "../kit";
import { glsl, tones } from "./common";

/** Свечение: два мягких световых пятна справа дышат и плавают. */
const fragment = glsl(/* glsl */ `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = u_time * 0.5;
  vec2 c1 = vec2(0.78 * aspect, 0.62) + vec2(sin(t * 0.6), cos(t * 0.5)) * 0.04;
  vec2 c2 = vec2(0.92 * aspect, 0.3) + vec2(cos(t * 0.4), sin(t * 0.7)) * 0.05;
  float g1 = exp(-pow(length(p - c1) / (0.38 + 0.04 * sin(t)), 2.0) * 2.2) * 0.9;
  float g2 = exp(-pow(length(p - c2) / (0.28 + 0.03 * cos(t * 1.3)), 2.0) * 2.2) * 0.7;
  float a = clamp(g1 + g2, 0.0, 1.0);
  fragColor = vec4(min(u_c1.rgb * g1 + u_c2.rgb * g2, vec3(a)), a);
}
`);

export const shader: ShaderScene = { place: "full", make: (p) => ({ fragment, speed: 1, uniforms: tones(p) }) };
