import { dotOrbitFragmentShader, getShaderNoiseTexture } from "@paper-design/shaders";
import type { ShaderScene } from "../kit";
import { color, colors, sizing } from "./sizing";

/** Точки-орбиты: сетка цветных точек, каждая кружит вокруг своего места. */
export const shader: ShaderScene = {
  place: "full",
  make: (p) => ({
    fragment: dotOrbitFragmentShader,
    speed: 0.3,
    uniforms: {
      u_colorBack: color(p.base),
      u_colors: colors(p.dark ? [p.accent, p.ramp[3], p.ramp[1], p.ramp[4]] : [p.ramp[2], p.ramp[3], p.accent, p.ramp[1]]),
      u_colorsCount: 4,
      u_size: 0.6,
      u_sizeRange: 0.4,
      u_spreading: 1,
      u_stepsPerColor: 3,
      u_noiseTexture: getShaderNoiseTexture(),
      ...sizing("pattern", { scale: 0.35 }),
    },
  }),
};
