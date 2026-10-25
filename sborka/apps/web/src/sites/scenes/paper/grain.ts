import { getShaderNoiseTexture, grainGradientFragmentShader, GrainGradientShapes } from "@paper-design/shaders";
import type { Palette } from "../palette";
import { color, colors, sizing } from "./sizing";

/** Зернистый градиент в одной из форм — общий для трёх сцен. */
export function grain(
  p: Palette,
  shape: keyof typeof GrainGradientShapes,
  over: { softness: number; intensity: number; noise: number; scale?: number },
) {
  return {
    fragment: grainGradientFragmentShader,
    speed: 0.5,
    uniforms: {
      u_colorBack: color(p.base),
      u_colors: colors(p.dark ? [p.accent, p.ramp[3], p.ramp[1]] : [p.ramp[2], p.ramp[3], p.ramp[1]]),
      u_colorsCount: 3,
      u_softness: over.softness,
      u_intensity: over.intensity,
      u_noise: over.noise,
      u_shape: GrainGradientShapes[shape],
      u_noiseTexture: getShaderNoiseTexture(),
      ...sizing(shape === "wave" ? "pattern" : "object", { fit: "cover", scale: over.scale ?? 1 }),
    },
  };
}
