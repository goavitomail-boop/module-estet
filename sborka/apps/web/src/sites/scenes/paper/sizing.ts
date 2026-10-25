import {
  defaultObjectSizing,
  defaultPatternSizing,
  getShaderColorFromString,
  ShaderFitOptions,
  type ShaderSizingParams,
} from "@paper-design/shaders";

/** Общее для эффектов Paper Shaders: размеры и цвета в том виде, в каком их ждёт шейдер. */

export const color = getShaderColorFromString;
export const colors = (list: string[]) => list.map((c) => getShaderColorFromString(c));
export const NONE = "#00000000";

export function sizing(kind: "object" | "pattern", over: ShaderSizingParams = {}) {
  const s = { ...(kind === "object" ? defaultObjectSizing : defaultPatternSizing), ...over };
  return {
    u_fit: ShaderFitOptions[s.fit],
    u_scale: s.scale,
    u_rotation: s.rotation,
    u_offsetX: s.offsetX,
    u_offsetY: s.offsetY,
    u_originX: s.originX,
    u_originY: s.originY,
    u_worldWidth: s.worldWidth,
    u_worldHeight: s.worldHeight,
  };
}

/** Картинка для шейдера: ShaderMount берёт только загруженные, поэтому Scene3D ждёт их перед запуском. */
export function image(src: string) {
  const img = new Image();
  img.src = src;
  return img;
}
