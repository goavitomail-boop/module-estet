import type { ShaderScene } from "../kit";
import { glsl, tones } from "./common";

/** Занавес сияния: полотна северного сияния колышутся в верхней части экрана. */
const fragment = glsl(/* glsl */ `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t = u_time * 0.2;
  float x = uv.x * 3.0 + fbm(vec2(uv.x * 1.5, t)) * 1.5;
  float bands = 0.5 + 0.5 * sin(x * 2.0 + t);
  float curtain = pow(0.5 + 0.5 * sin(x * 6.0 + fbm(vec2(x, uv.y * 2.0 + t)) * 4.0), 3.0);
  float vertical = smoothstep(0.05, 0.55, uv.y) * smoothstep(1.1, 0.75, uv.y);
  float rays = 0.6 + 0.4 * fbm(vec2(x * 4.0, uv.y * 0.5 - t));
  float a = clamp(curtain * vertical * rays * (0.5 + 0.5 * bands) * 2.2, 0.0, 1.0) * (u_dark > 0.5 ? 1.0 : 0.8);
  vec3 col = mix(u_c1.rgb, u_c2.rgb, uv.y);
  col = mix(col, u_c3.rgb, curtain * 0.3);
  fragColor = vec4(col * a, a);
}
`);

export const shader: ShaderScene = { place: "full", make: (p) => ({ fragment, speed: 0.7, uniforms: tones(p) }) };
