"use client";

import gsap from "gsap";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin);
}

export { gsap, ScrollTrigger, SplitText };

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isFinePointer() {
  return typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/* Прелоадер сообщает, что страница открыта и можно запускать анимации первого экрана. */
const READY_EVENT = "sborka:ready";
let ready = false;

export function markReady() {
  if (ready) return;
  ready = true;
  window.dispatchEvent(new Event(READY_EVENT));
}

export function onReady(cb: () => void) {
  if (ready) {
    cb();
    return () => {};
  }
  window.addEventListener(READY_EVENT, cb, { once: true });
  return () => window.removeEventListener(READY_EVENT, cb);
}
