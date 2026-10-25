import { ditheringFragmentShader, DitheringShapes, DitheringTypes } from "@paper-design/shaders";
import type { ShaderScene } from "../kit";
import { color, sizing } from "./sizing";

/** Ретро-пиксели: волны из крупных пикселей, как на экранах старых компьютеров. */
export const shader: ShaderScene = {
  place: "full",
  make: (p) => ({
    fragment: ditheringFragmentShader,
    speed: 0.5,
    uniforms: {
      u_colorBack: color(p.base),
      u_colorFront: color(p.dark ? p.accent : p.ramp[2]),
      u_shape: DitheringShapes.warp,
      u_type: DitheringTypes["4x4"],
      u_pxSize: 3,
      ...sizing("pattern", { scale: 0.9 }),
    },
  }),
};
