import type { ShaderScene } from "../kit";
import { glsl, tones } from "./common";

/** Прожектор: лучи света падают сверху и медленно покачиваются, в них блестит пыль. */
const fragment = glsl(/* glsl */ `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y);
  vec2 d = p - vec2(0.35 * aspect, 1.15);
  float ang = atan(d.x, -d.y);
  float dist = length(d);
  float t = u_time * 0.3;
  float a = 0.0;
  for (float i = 0.0; i < 3.0; i++) {
    float center = -0.35 + i * 0.3 + sin(t + i * 2.1) * 0.08;
    float width = 0.06 + 0.03 * sin(t * 0.7 + i);
    a += exp(-pow((ang - center) / width, 2.0)) * (0.55 - i * 0.1);
  }
  a *= smoothstep(1.6, 0.2, dist);
  a *= 0.7 + 0.5 * (fbm(p * 6.0 + vec2(0.0, -t * 0.5)) * 0.5 + 0.5);
  a = clamp(a, 0.0, 1.0) * (u_dark > 0.5 ? 0.9 : 0.6);
  vec3 col = mix(u_c3.rgb, u_c1.rgb, 0.4);
  fragColor = vec4(col * a, a);
}
`);

export const shader: ShaderScene = { place: "full", make: (p) => ({ fragment, speed: 0.8, uniforms: tones(p) }) };
