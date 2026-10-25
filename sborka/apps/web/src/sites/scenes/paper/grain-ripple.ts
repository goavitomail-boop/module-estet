import type { ShaderScene } from "../kit";
import { grain } from "./grain";

/** Круги: концентрические волны цвета с зерном расходятся от центра. */
export const shader: ShaderScene = {
  place: "full",
  make: (p) => grain(p, "ripple", { softness: 0.55, intensity: 0.45, noise: 0.4, scale: 0.7 }),
};
