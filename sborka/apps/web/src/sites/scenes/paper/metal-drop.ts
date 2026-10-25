import type { ShaderScene } from "../kit";
import { metal } from "./metal";

/** Жидкий металл: капли ртути перетекают и сливаются. */
export const shader: ShaderScene = { place: "object", make: (p) => metal(p, "metaballs") };
