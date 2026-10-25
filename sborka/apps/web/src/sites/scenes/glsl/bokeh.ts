import type { ShaderScene } from "../kit";
import { glsl, tones } from "./common";

/** Боке: размытые круги света медленно всплывают, как огни вне фокуса. */
const fragment = glsl(/* glsl */ `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = u_time * 0.04;
  vec3 acc = vec3(0.0);
  float a = 0.0;
  for (float i = 0.0; i < 30.0; i++) {
    float hx = hash1(vec2(i, 1.3));
    float hy = hash1(vec2(i, 7.7));
    float y = fract(hy + t * (0.3 + hx * 0.5));
    vec2 c = vec2((0.35 + hx * 0.7) * aspect + sin(u_time * 0.1 + i) * 0.03, y * 1.3 - 0.15);
    float r = 0.025 + hash1(vec2(i, 3.1)) * 0.075;
    float k = smoothstep(r, r * 0.75, length(p - c)) * (0.3 + 0.5 * hash1(vec2(i, 9.0)));
    k *= smoothstep(0.0, 0.15, y) * smoothstep(1.0, 0.8, y);
    float pick = hash1(vec2(i, 5.5));
    vec3 col = pick < 0.33 ? u_c1.rgb : (pick < 0.66 ? u_c2.rgb : u_c3.rgb);
    acc += col * k;
    a += k;
  }
  a = clamp(a, 0.0, 1.0);
  fragColor = vec4(min(acc, vec3(a)), a);
}
`);

export const shader: ShaderScene = { place: "full", make: (p) => ({ fragment, speed: 1, uniforms: tones(p) }) };
