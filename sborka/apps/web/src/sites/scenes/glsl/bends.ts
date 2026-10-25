import type { ShaderScene } from "../kit";
import { glsl, tones } from "./common";

/** Неоновые изгибы: три светящиеся ленты плавно изгибаются справа. */
const fragment = glsl(/* glsl */ `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float aspect = u_resolution.x / u_resolution.y;
  float x = uv.x * aspect;
  float t = u_time * 0.35;
  vec3 acc = vec3(0.0);
  float a = 0.0;
  for (float i = 0.0; i < 3.0; i++) {
    float y = 0.5 + sin(x * 1.6 + t + i * 2.0) * 0.22 + sin(x * 3.1 - t * 0.7 + i) * 0.06 + (i - 1.0) * 0.12;
    float d = abs(uv.y - y);
    float g = pow(0.005 / (d + 0.005), 1.6) * smoothstep(0.0, 0.45, uv.x);
    vec3 c = i < 0.5 ? u_c1.rgb : (i < 1.5 ? u_c2.rgb : u_c3.rgb);
    acc += c * g;
    a += g;
  }
  a = clamp(a, 0.0, 1.0);
  fragColor = vec4(clamp(acc, 0.0, 1.0) * min(1.0, a / max(a, 0.001)), a);
}
`);

export const shader: ShaderScene = { place: "full", make: (p) => ({ fragment, speed: 0.8, uniforms: tones(p) }) };
