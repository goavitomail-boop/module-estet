import { getShaderNoiseTexture, metaballsFragmentShader } from "@paper-design/shaders";
import type { ShaderScene } from "../kit";
import { color, colors, NONE, sizing } from "./sizing";

/** Капли: мягкие капли сливаются и расходятся, как в лавовой лампе. */
export const shader: ShaderScene = {
  place: "object",
  make: (p) => ({
    fragment: metaballsFragmentShader,
    speed: 0.6,
    uniforms: {
      u_colorBack: color(NONE),
      u_colors: colors([p.accent, p.shift(p.accent, 24, 0.05, 0.1), p.mix(p.accent, "#ffffff", 0.45), p.shift(p.accent, -20, 0, -0.05)]),
      u_colorsCount: 4,
      u_size: 0.8,
      u_count: 9,
      u_noiseTexture: getShaderNoiseTexture(),
      ...sizing("object"),
    },
  }),
};
