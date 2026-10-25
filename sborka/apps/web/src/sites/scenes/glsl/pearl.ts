import type { ShaderScene } from "../kit";
import { glsl, tones } from "./common";

/** Перламутр: радужные переливы, как внутри ракушки. */
const fragment = glsl(/* glsl */ `
void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  float t = u_time * 0.2;
  vec2 q = p * 1.3;
  float f = fbm(q + vec2(t * 0.3, -t * 0.2));
  float g = fbm(q * 1.4 + f * 2.0 + vec2(-t * 0.1, t * 0.15));
  vec3 iri = 0.5 + 0.5 * cos(TAU * (g * 1.2 + f * 0.5 + vec3(0.0, 0.33, 0.67)) + t);
  vec3 tint = mix(u_c0.rgb, u_c3.rgb, smoothstep(-0.3, 0.6, g));
  vec3 col = mix(tint, iri, 0.45);
  col = mix(col, u_base.rgb, u_dark > 0.5 ? 0.35 : 0.25);
  col += pow(smoothstep(0.2, 0.7, g), 3.0) * (u_dark > 0.5 ? 0.25 : 0.15);
  fragColor = vec4(col, 1.0);
}
`);

export const shader: ShaderScene = { place: "full", make: (p) => ({ fragment, speed: 0.6, uniforms: tones(p) }) };
