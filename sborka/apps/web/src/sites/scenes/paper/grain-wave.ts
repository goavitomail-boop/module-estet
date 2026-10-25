import type { ShaderScene } from "../kit";
import { grain } from "./grain";

/** Зернистая волна: цветная волна с зерном плавно проходит по экрану. */
export const shader: ShaderScene = { place: "full", make: (p) => grain(p, "wave", { softness: 0.75, intensity: 0.2, noise: 0.45 }) };
