import { neuroNoiseFragmentShader } from "@paper-design/shaders";
import type { ShaderScene } from "../kit";
import { color, sizing } from "./sizing";

/** Нейросеть: паутина светящихся линий медленно перетекает. */
export const shader: ShaderScene = {
  place: "full",
  make: (p) => ({
    fragment: neuroNoiseFragmentShader,
    speed: 0.5,
    uniforms: {
      u_colorFront: color(p.dark ? p.mix(p.accent, "#ffffff", 0.65) : p.mix(p.accent, "#000000", 0.2)),
      u_colorMid: color(p.dark ? p.accent : p.ramp[2]),
      u_colorBack: color(p.base),
      u_brightness: p.dark ? 0.05 : 0.02,
      u_contrast: p.dark ? 0.3 : 0.45,
      ...sizing("pattern", { scale: 1.2 }),
    },
  }),
};
