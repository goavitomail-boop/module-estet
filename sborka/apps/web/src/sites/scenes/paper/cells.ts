import { getShaderNoiseTexture, voronoiFragmentShader } from "@paper-design/shaders";
import type { ShaderScene } from "../kit";
import { color, colors, sizing } from "./sizing";

/** Ячейки: живая сетка из ячеек со светящимися краями. */
export const shader: ShaderScene = {
  place: "full",
  make: (p) => ({
    fragment: voronoiFragmentShader,
    speed: 0.3,
    uniforms: {
      u_colors: colors(p.dark ? [p.ramp[0], p.ramp[1]] : [p.ramp[0], p.bg]),
      u_colorsCount: 2,
      u_stepsPerColor: 3,
      u_colorGlow: color(p.dark ? p.accent : p.ramp[2]),
      u_colorGap: color(p.dark ? p.accent : p.ramp[3]),
      u_distortion: 0.4,
      u_gap: 0.025,
      u_glow: 0.6,
      u_noiseTexture: getShaderNoiseTexture(),
      ...sizing("pattern", { scale: 0.6 }),
    },
  }),
};
