import { meshGradientFragmentShader } from "@paper-design/shaders";
import type { ShaderScene } from "../kit";
import { colors, sizing } from "./sizing";

/** Переливы: цветные пятна плывут и перетекают друг в друга. */
export const shader: ShaderScene = {
  place: "full",
  make: (p) => ({
    fragment: meshGradientFragmentShader,
    speed: 0.35,
    uniforms: {
      u_colors: colors(p.dark ? [p.base, p.ramp[1], p.accent, p.ramp[3]] : [p.bg, p.ramp[1], p.ramp[2], p.ramp[3]]),
      u_colorsCount: 4,
      u_distortion: 0.85,
      u_swirl: 0.35,
      u_grainMixer: 0,
      u_grainOverlay: 0.06,
      ...sizing("object", { fit: "cover" }),
    },
  }),
};
