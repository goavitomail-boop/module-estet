import type { ShaderScene } from "../kit";
import { glsl, tones } from "./common";

/** Плазма: светящийся дым медленно клубится. */
const fragment = glsl(/* glsl */ `
void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  float t = u_time * 0.15;
  vec2 q = p * 1.2;
  vec2 w = vec2(fbm(q * 1.1 + t), fbm(q * 1.1 - t + 3.1));
  float v = fbm(q + w * 1.8 + vec2(t * 0.5, 0.0));
  vec3 col = mix(u_base.rgb, u_c0.rgb, smoothstep(-0.3, 0.25, v));
  col = mix(col, u_c1.rgb, smoothstep(0.05, 0.45, v));
  col += u_c3.rgb * pow(smoothstep(0.3, 0.7, v), 2.0) * 0.6;
  fragColor = vec4(col, 1.0);
}
`);

export const shader: ShaderScene = { place: "full", make: (p) => ({ fragment, speed: 0.8, uniforms: tones(p) }) };
