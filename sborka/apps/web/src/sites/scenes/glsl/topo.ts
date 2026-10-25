import type { ShaderScene } from "../kit";
import { glsl, tones } from "./common";

/** Топография: линии высот, как на карте, медленно перетекают. Каждая пятая — ярче. */
const fragment = glsl(/* glsl */ `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = gl_FragCoord.xy / u_resolution.y;
  float t = u_time * 0.05;
  float v = (fbm(p * 1.6 + vec2(t, -t * 0.6)) + fbm(p * 0.6 - t * 0.3) * 0.5) * 9.0;
  float f = fract(v);
  float d = min(f, 1.0 - f);
  float w = fwidth(v) * 1.2;
  float major = mod(floor(v + 0.5), 5.0) < 0.5 ? 1.0 : 0.0;
  float a = (1.0 - smoothstep(0.0, w * (1.0 + major), d)) * (0.45 + 0.4 * major);
  a *= smoothstep(0.05, 0.7, uv.x) * 0.8 + 0.2;
  fragColor = vec4(u_c1.rgb * a, a);
}
`);

export const shader: ShaderScene = { place: "full", make: (p) => ({ fragment, speed: 1, uniforms: tones(p) }) };
