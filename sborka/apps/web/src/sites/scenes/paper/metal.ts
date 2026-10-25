import { liquidMetalFragmentShader, LiquidMetalShapes } from "@paper-design/shaders";
import type { Palette } from "../palette";
import { color, NONE, sizing } from "./sizing";

/** Жидкий металл в одной из форм — общий для двух сцен. */
export function metal(p: Palette, shape: keyof typeof LiquidMetalShapes) {
  return {
    fragment: liquidMetalFragmentShader,
    speed: 0.8,
    uniforms: {
      u_colorBack: color(NONE),
      u_colorTint: color(p.mix(p.accent, "#ffffff", 0.35)),
      u_contour: 0.4,
      u_distortion: 0.07,
      u_softness: 0.1,
      u_repetition: 2,
      u_shiftRed: 0.3,
      u_shiftBlue: 0.3,
      u_angle: 70,
      u_isImage: false,
      u_shape: LiquidMetalShapes[shape],
      ...sizing("object", { scale: 0.8 }),
    },
  };
}
