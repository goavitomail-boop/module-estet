import { spiralFragmentShader } from "@paper-design/shaders";
import type { ShaderScene } from "../kit";
import { color, sizing } from "./sizing";

/** Спираль: мягкие волнистые кольца расходятся из точки справа. */
export const shader: ShaderScene = {
  place: "full",
  make: (p) => ({
    fragment: spiralFragmentShader,
    speed: 0.35,
    uniforms: {
      u_colorBack: color(p.base),
      u_colorFront: color(p.dark ? p.mix(p.accent, p.base, 0.45) : p.ramp[1]),
      u_density: 0.5,
      u_distortion: 0,
      u_strokeWidth: 0.5,
      u_strokeTaper: 0,
      u_strokeCap: 0,
      u_noiseFrequency: 0.3,
      u_noise: 0.6,
      u_softness: 0.3,
      ...sizing("pattern", { scale: 1.3, offsetX: 0.35 }),
    },
  }),
};
