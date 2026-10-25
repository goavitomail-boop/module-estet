import { getShaderColorFromString as color } from "@paper-design/shaders";
import type { Palette } from "../palette";

/**
 * Общая шапка наших шейдеров: время, размер, цвета сайта и шум.
 * Шум градиентный, по классической схеме: случайные градиенты в узлах сетки и плавная интерполяция.
 * Вывод — с предумноженной прозрачностью: прозрачные эффекты пропускают фон сайта.
 */
const HEAD = /* glsl */ `#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform vec4 u_base;
uniform vec4 u_c0;
uniform vec4 u_c1;
uniform vec4 u_c2;
uniform vec4 u_c3;
uniform float u_dark;
out vec4 fragColor;
#define TAU 6.28318530718

float hash1(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = dot(hash2(i), f);
  float b = dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

mat2 rot(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}
`;

export const glsl = (body: string) => HEAD + body;

/** Цвета для наших шейдеров: фон, глубокий, основной, соседний оттенок и блик. */
export function tones(p: Palette) {
  const list = p.dark
    ? [p.ramp[1], p.accent, p.ramp[3], p.mix(p.accent, "#ffffff", 0.7)]
    : [p.ramp[1], p.mix(p.accent, p.bg, 0.15), p.shift(p.accent, -25, 0, 0.05), p.accent];
  return {
    u_base: color(p.base),
    u_c0: color(list[0]),
    u_c1: color(list[1]),
    u_c2: color(list[2]),
    u_c3: color(list[3]),
    u_dark: p.dark ? 1 : 0,
  };
}
