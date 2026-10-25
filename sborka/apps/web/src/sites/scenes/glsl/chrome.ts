import type { ShaderScene } from "../kit";
import { glsl, tones } from "./common";

/** Жидкий хром: зеркальная жидкость перетекает, в ней отражаются полосы света. */
const fragment = glsl(/* glsl */ `
float field(vec2 q, vec2 w, float t) {
  return fbm(q + 1.6 * w + t);
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  float t = u_time * 0.15;
  vec2 q = p * 0.9;
  vec2 w = vec2(fbm(q + vec2(0.0, t)), fbm(q + vec2(5.2, -t)));
  float e = 0.003;
  float h = field(q, w, t);
  float hx = field(q + vec2(e, 0.0), w, t) - h;
  float hy = field(q + vec2(0.0, e), w, t) - h;
  vec3 n = normalize(vec3(-hx / e, -hy / e, 1.2));
  vec3 r = reflect(vec3(0.0, 0.0, -1.0), n);
  float band = smoothstep(0.15, 0.85, 0.5 + 0.5 * sin(r.y * 5.0 + r.x * 1.2 + h * 2.4));
  float fres = pow(1.0 - clamp(n.z, 0.0, 1.0), 2.0);
  vec3 lo = u_dark > 0.5 ? vec3(0.03) : vec3(0.42);
  vec3 hi = u_dark > 0.5 ? vec3(0.92) : vec3(0.99);
  vec3 col = mix(lo, hi, band);
  col = mix(col, u_c1.rgb, 0.18 + fres * 0.4);
  col = mix(col, u_base.rgb, u_dark > 0.5 ? 0.12 : 0.4);
  fragColor = vec4(col, 1.0);
}
`);

export const shader: ShaderScene = { place: "full", make: (p) => ({ fragment, speed: 0.7, uniforms: tones(p) }) };
