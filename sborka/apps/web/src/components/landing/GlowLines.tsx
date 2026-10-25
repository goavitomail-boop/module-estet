import s from "./GlowLines.module.css";

/**
 * Лаймовые световые линии на фоне. По каждой линии бегут яркие импульсы.
 * Набор линий зависит от секции.
 */
const SETS = {
  hero: [
    "M-40 760 C 300 700, 520 640, 760 560 S 1180 380, 1500 420",
    "M380 -20 C 520 160, 620 300, 700 420 S 860 700, 1100 940",
    "M-60 860 C 260 820, 700 900, 1000 820 S 1360 700, 1500 760",
    "M1500 120 C 1320 200, 1220 260, 1160 380",
  ],
  demo: [
    "M600 820 C 820 640, 1000 600, 1500 680",
    "M720 -40 C 820 160, 1040 300, 1500 260",
  ],
  examples: ["M560 -40 C 640 120, 820 220, 1100 200 S 1400 120, 1500 160"],
  final: ["M-40 300 C 300 220, 600 340, 900 260 S 1300 180, 1500 260"],
} as const;

export function GlowLines({ set, className }: { set: keyof typeof SETS; className?: string }) {
  return (
    <svg className={`${s.svg} ${className ?? ""}`} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={`gl-${set}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#c8ff3d" stopOpacity="0" />
          <stop offset="0.35" stopColor="#c8ff3d" stopOpacity="0.9" />
          <stop offset="1" stopColor="#c8ff3d" stopOpacity="0.15" />
        </linearGradient>
        <filter id={`glb-${set}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      {SETS[set].map((d, i) => (
        <g key={i}>
          <path d={d} className={s.halo} stroke={`url(#gl-${set})`} filter={`url(#glb-${set})`} />
          <path d={d} className={s.base} stroke={`url(#gl-${set})`} />
          <path d={d} className={s.pulse} pathLength={1} style={{ animationDelay: `${i * -1.7}s`, animationDuration: `${5 + i * 1.3}s` }} />
        </g>
      ))}
    </svg>
  );
}
