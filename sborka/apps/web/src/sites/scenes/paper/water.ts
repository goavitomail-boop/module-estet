import { emptyPixel, waterFragmentShader } from "@paper-design/shaders";
import type { ShaderScene } from "../kit";
import { color, image, sizing } from "./sizing";

/** Вода: блики и каустика, как солнце на дне бассейна. */
export const shader: ShaderScene = {
  place: "full",
  make: (p) => ({
    fragment: waterFragmentShader,
    speed: 0.5,
    uniforms: {
      u_image: image(emptyPixel),
      u_colorBack: color(p.dark ? p.mix(p.accent, p.base, 0.6) : p.mix(p.accent, p.bg, 0.65)),
      u_colorHighlight: color(p.dark ? p.mix(p.accent, "#ffffff", 0.7) : "#ffffff"),
      u_highlights: 0.3,
      u_layering: 0.5,
      u_edges: 0.8,
      u_waves: 0.35,
      u_caustic: 0.55,
      u_size: 1,
      ...sizing("object", { fit: "cover", scale: 1.6 }),
    },
  }),
};
