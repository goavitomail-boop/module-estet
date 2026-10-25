import { getShaderNoiseTexture, godRaysFragmentShader } from "@paper-design/shaders";
import type { ShaderScene } from "../kit";
import { color, colors, sizing } from "./sizing";

/** Сияние: лучи света расходятся из-за правого края экрана и медленно мерцают. */
export const shader: ShaderScene = {
  place: "full",
  make: (p) => ({
    fragment: godRaysFragmentShader,
    speed: 0.5,
    uniforms: {
      u_colorBack: color(p.base),
      u_colorBloom: color(p.accent),
      u_colors: colors(
        p.dark
          ? [p.alpha(p.ramp[4], 0.45), p.alpha(p.accent, 0.9), "#ffffffcc", p.ramp[3]]
          : [p.alpha(p.ramp[2], 0.6), p.alpha(p.accent, 0.7), p.alpha(p.ramp[3], 0.8)],
      ),
      u_colorsCount: p.dark ? 4 : 3,
      u_density: 0.3,
      u_spotty: 0.3,
      u_midIntensity: 0.4,
      u_midSize: 0.2,
      u_intensity: p.dark ? 0.8 : 0.6,
      u_bloom: 0.4,
      u_noiseTexture: getShaderNoiseTexture(),
      ...sizing("object", { fit: "cover", offsetX: 0.7, offsetY: -0.4 }),
    },
  }),
};
