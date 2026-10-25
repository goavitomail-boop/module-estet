import type { ShaderScene } from "../kit";
import { glsl, tones } from "./common";

/** Нити: пучок тонких линий веером расходится вправо и колышется. */
const fragment = glsl(/* glsl */ `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t = u_time * 0.4;
  float a = 0.0;
  float w = 1.4 / u_resolution.y * (1.0 + uv.x);
  for (float i = 0.0; i < 28.0; i++) {
    float k = i / 27.0;
    float spread = mix(0.02, 0.55, uv.x);
    float y = 0.42 + (k - 0.5) * spread + sin(uv.x * 4.0 + t + k * 2.5) * 0.08 * uv.x + sin(uv.x * 9.0 - t * 1.3 + k * 4.0) * 0.02 * uv.x;
    float d = abs(uv.y - y);
    a += smoothstep(w * 2.5, 0.0, d) * (0.35 + 0.65 * uv.x) * (0.6 + 0.4 * sin(k * 9.0));
  }
  a = clamp(a, 0.0, 1.0);
  vec3 col = mix(u_c1.rgb, u_c3.rgb, uv.x);
  fragColor = vec4(col * a, a);
}
`);

export const shader: ShaderScene = { place: "full", make: (p) => ({ fragment, speed: 0.7, uniforms: tones(p) }) };
