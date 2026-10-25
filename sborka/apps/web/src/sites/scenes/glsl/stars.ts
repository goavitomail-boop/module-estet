import type { ShaderScene } from "../kit";
import { glsl, tones } from "./common";

/** Звёздное небо: мерцающие звёзды и туманность в цвете сайта. */
const fragment = glsl(/* glsl */ `
void main() {
  vec2 p = gl_FragCoord.xy / u_resolution.y;
  float t = u_time;
  float n = fbm(p * 1.5 + vec2(t * 0.02, 0.0)) + 0.3;
  vec3 col = mix(u_base.rgb, u_c0.rgb, smoothstep(-0.1, 0.7, n) * 0.8);
  col = mix(col, u_c1.rgb, smoothstep(0.3, 0.85, n) * 0.6);
  float s = 0.0;
  for (float l = 0.0; l < 3.0; l++) {
    vec2 g = p * (18.0 + l * 14.0) + l * 7.1;
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    float h = hash1(id + l);
    vec2 off = vec2(hash1(id + 3.1), hash1(id + 7.3)) - 0.5;
    float tw = 0.6 + 0.4 * sin(t * (1.0 + h * 3.0) + h * 40.0);
    s += step(0.8, h) * smoothstep(0.09 - l * 0.02, 0.0, length(f - off * 0.7)) * tw * (1.0 - l * 0.2);
  }
  col += s * (u_dark > 0.5 ? vec3(1.0) : u_c3.rgb);
  fragColor = vec4(col, 1.0);
}
`);

export const shader: ShaderScene = { place: "full", make: (p) => ({ fragment, speed: 1, uniforms: tones(p) }) };
