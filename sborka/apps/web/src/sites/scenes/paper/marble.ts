import { getShaderNoiseTexture, warpFragmentShader, WarpPatterns } from "@paper-design/shaders";
import type { ShaderScene } from "../kit";
import { colors, sizing } from "./sizing";

/** Мрамор: цветные разводы закручиваются, как краска на воде. */
export const shader: ShaderScene = {
  place: "full",
  make: (p) => ({
    fragment: warpFragmentShader,
    speed: 0.3,
    uniforms: {
      u_colors: colors(p.dark ? [p.base, p.ramp[1], p.base, p.accent] : [p.bg, p.ramp[1], p.bg, p.ramp[2]]),
      u_colorsCount: 4,
      u_proportion: 0.45,
      u_softness: 1,
      u_distortion: 0.25,
      u_swirl: 0.8,
      u_swirlIterations: 10,
      u_shapeScale: 0.1,
      u_shape: WarpPatterns.checks,
      u_noiseTexture: getShaderNoiseTexture(),
      ...sizing("pattern"),
    },
  }),
};
