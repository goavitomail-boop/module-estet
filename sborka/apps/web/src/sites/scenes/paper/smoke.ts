import { getShaderNoiseTexture, smokeRingFragmentShader } from "@paper-design/shaders";
import type { ShaderScene } from "../kit";
import { color, colors, NONE, sizing } from "./sizing";

/** Дымное кольцо: светящийся дым закручивается в кольцо. */
export const shader: ShaderScene = {
  place: "object",
  make: (p, small) => ({
    fragment: smokeRingFragmentShader,
    speed: 0.5,
    uniforms: {
      u_colorBack: color(NONE),
      u_colors: colors(p.dark ? [p.mix(p.accent, "#ffffff", 0.7), p.accent, p.ramp[1]] : [p.accent, p.ramp[3], p.ramp[2]]),
      u_colorsCount: 3,
      u_noiseScale: 3,
      u_noiseIterations: small ? 5 : 8,
      u_radius: 0.27,
      u_thickness: 0.6,
      u_innerShape: 0.7,
      u_noiseTexture: getShaderNoiseTexture(),
      ...sizing("object", { scale: 0.9 }),
    },
  }),
};
