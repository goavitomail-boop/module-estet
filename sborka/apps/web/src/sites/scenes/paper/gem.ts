import { gemSmokeFragmentShader, GemSmokeShapes } from "@paper-design/shaders";
import type { ShaderScene } from "../kit";
import { color, colors, NONE, sizing } from "./sizing";

/** Дымчатый кристалл: внутри стеклянного ромба клубится цветной дым. */
export const shader: ShaderScene = {
  place: "object",
  make: (p) => ({
    fragment: gemSmokeFragmentShader,
    speed: 0.8,
    uniforms: {
      u_colors: colors([p.accent, p.shift(p.accent, 25, 0.05, 0.12), p.mix(p.accent, "#ffffff", 0.6)]),
      u_colorsCount: 3,
      u_colorBack: color(NONE),
      u_colorInner: color(NONE),
      u_innerDistortion: 0.8,
      u_outerDistortion: 0.6,
      u_outerGlow: 0.25,
      u_innerGlow: 1,
      u_offset: 0,
      u_angle: 0,
      u_size: 0.8,
      u_isImage: false,
      u_shape: GemSmokeShapes.diamond,
      ...sizing("object", { scale: 0.6 }),
    },
  }),
};
