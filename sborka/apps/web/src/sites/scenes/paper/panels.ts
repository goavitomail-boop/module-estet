import { colorPanelsFragmentShader } from "@paper-design/shaders";
import type { ShaderScene } from "../kit";
import { color, colors, NONE, sizing } from "./sizing";

/** Световые панели: полупрозрачные светящиеся пластины вращаются вокруг оси. */
export const shader: ShaderScene = {
  place: "object",
  make: (p) => ({
    fragment: colorPanelsFragmentShader,
    speed: 0.6,
    uniforms: {
      u_colors: colors([p.accent, p.shift(p.accent, 30, 0.05, 0.1), p.mix(p.accent, "#ffffff", 0.5), p.shift(p.accent, -35, 0, 0)]),
      u_colorsCount: 4,
      u_colorBack: color(NONE),
      u_angle1: 0.3,
      u_angle2: 0.3,
      u_length: 1,
      u_edges: true,
      u_blur: 0.2,
      u_fadeIn: 0.85,
      u_fadeOut: 0.3,
      u_density: 1.6,
      u_gradient: 0,
      ...sizing("object", { rotation: 112 }),
    },
  }),
};
