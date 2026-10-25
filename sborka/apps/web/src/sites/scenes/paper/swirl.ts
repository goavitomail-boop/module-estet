import { swirlFragmentShader } from "@paper-design/shaders";
import type { ShaderScene } from "../kit";
import { color, colors, sizing } from "./sizing";

/** Водоворот: мягкие цветные полосы закручиваются вокруг точки справа. */
export const shader: ShaderScene = {
  place: "full",
  make: (p) => ({
    fragment: swirlFragmentShader,
    speed: 0.25,
    uniforms: {
      u_colorBack: color(p.base),
      u_colors: colors(p.dark ? [p.ramp[1], p.accent, p.ramp[3]] : [p.ramp[0], p.ramp[2], p.ramp[1]]),
      u_colorsCount: 3,
      u_bandCount: 4,
      u_twist: 0.12,
      u_center: 0.2,
      u_proportion: 0.5,
      u_softness: 0.6,
      u_noiseFrequency: 0.4,
      u_noise: 0.2,
      ...sizing("object", { fit: "cover", offsetX: 0.45, scale: 1.2 }),
    },
  }),
};
