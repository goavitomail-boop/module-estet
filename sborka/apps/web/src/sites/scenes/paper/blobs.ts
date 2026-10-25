import { simplexNoiseFragmentShader } from "@paper-design/shaders";
import type { ShaderScene } from "../kit";
import { colors, sizing } from "./sizing";

/** Плавные пятна: крупные мягкие пятна цвета медленно меняют форму. */
export const shader: ShaderScene = {
  place: "full",
  make: (p) => ({
    fragment: simplexNoiseFragmentShader,
    speed: 0.25,
    uniforms: {
      u_colors: colors(p.dark ? [p.base, p.ramp[0], p.ramp[1], p.accent] : [p.bg, p.ramp[0], p.ramp[1], p.ramp[2]]),
      u_colorsCount: 4,
      u_stepsPerColor: 1,
      u_softness: 1,
      ...sizing("pattern", { scale: 1.6 }),
    },
  }),
};
