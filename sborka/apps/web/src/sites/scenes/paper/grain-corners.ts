import type { ShaderScene } from "../kit";
import { grain } from "./grain";

/** Зернистое свечение: мягкие цветные пятна из углов, с плёночным зерном. */
export const shader: ShaderScene = { place: "full", make: (p) => grain(p, "corners", { softness: 0.6, intensity: 0.45, noise: 0.3 }) };
