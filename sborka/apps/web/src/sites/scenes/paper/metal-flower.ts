import type { ShaderScene } from "../kit";
import { metal } from "./metal";

/** Металлический цветок: хромированный цветок с бегущими по нему бликами. */
export const shader: ShaderScene = { place: "object", make: (p) => metal(p, "daisy") };
