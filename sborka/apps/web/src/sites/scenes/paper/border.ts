import { getShaderNoiseTexture, pulsingBorderFragmentShader, PulsingBorderAspectRatios } from "@paper-design/shaders";
import type { ShaderScene } from "../kit";
import { color, colors, NONE, sizing } from "./sizing";

/** Светящаяся рамка: по краю первого экрана бегут переливы света. */
export const shader: ShaderScene = {
  place: "full",
  make: (p) => ({
    fragment: pulsingBorderFragmentShader,
    speed: 0.6,
    uniforms: {
      u_colorBack: color(NONE),
      u_colors: colors([p.accent, p.shift(p.accent, 35, 0.05, 0.1), p.shift(p.accent, -40, 0.05, 0.05)]),
      u_colorsCount: 3,
      u_roundness: 0.08,
      u_thickness: 0.05,
      u_marginLeft: 0.015,
      u_marginRight: 0.015,
      u_marginTop: 0.02,
      u_marginBottom: 0.02,
      u_aspectRatio: PulsingBorderAspectRatios.auto,
      u_softness: 0.75,
      u_intensity: 0.25,
      u_bloom: 0.3,
      u_spots: 4,
      u_spotSize: 0.5,
      u_pulse: 0.25,
      u_smoke: 0.3,
      u_smokeSize: 0.6,
      u_noiseTexture: getShaderNoiseTexture(),
      ...sizing("object", { fit: "cover" }),
    },
  }),
};
