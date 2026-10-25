import type { IconName, NicheId } from "@/lib/sites/schema";
import { iconPaths } from "./icons";

/**
 * Абстрактная композиция вместо фото, пока клиент не загрузил свои.
 * Цвета берутся из переменных темы сайта.
 */
export function MoodArt({ niche, variant = 0, icon = "sparkle" }: { niche: NicheId; variant?: number; icon?: IconName }) {
  const flip = variant % 2 === 1;
  return (
    <svg
      viewBox="0 0 400 500"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      style={{ width: "100%", height: "100%", display: "block", transform: flip ? "scaleX(-1)" : undefined }}
    >
      <rect width="400" height="500" fill="var(--s-surface)" />
      {ART[niche] ?? generic(icon)}
    </svg>
  );
}

// Округляем, чтобы координаты совпадали на сервере и в браузере.
const round = (n: number) => Math.round(n * 100) / 100;

/** Композиция для ниш без собственной иллюстрации: арка, круги и крупная иконка ниши. */
function generic(icon: IconName) {
  return (
    <>
      <circle cx="285" cy="150" r="150" fill="var(--s-accent)" opacity="0.14" />
      <path d="M60 500V370a110 110 0 0 1 220 0v130Z" fill="var(--s-accent)" opacity="0.9" />
      <circle cx="92" cy="112" r="28" fill="var(--s-bg)" />
      <path d="M40 300a150 150 0 0 1 300 0" fill="none" stroke="var(--s-text)" strokeOpacity="0.2" strokeWidth="1.5" />
      <svg x="115" y="345" width="110" height="110" viewBox="0 0 24 24" fill="none" stroke="var(--s-accent-text)" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
        {iconPaths(icon)}
      </svg>
    </>
  );
}

const ART: Partial<Record<NicheId, React.ReactNode>> = {
  nails: (
    <>
      <path d="M60 500V230a110 110 0 0 1 220 0v270Z" fill="var(--s-accent)" opacity="0.18" />
      <path d="M150 500V300a90 90 0 0 1 180 0v200Z" fill="var(--s-accent)" opacity="0.85" />
      <circle cx="300" cy="120" r="46" fill="var(--s-bg)" />
      <circle cx="300" cy="120" r="18" fill="var(--s-accent)" opacity="0.5" />
      <path d="M60 230a110 110 0 0 1 220 0" fill="none" stroke="var(--s-text)" strokeOpacity="0.25" strokeWidth="1.5" />
    </>
  ),
  repair: (
    <>
      {Array.from({ length: 6 }, (_, i) => (
        <line key={i} x1="0" y1={80 + i * 70} x2="400" y2={80 + i * 70} stroke="var(--s-line)" strokeWidth="2" />
      ))}
      <rect x="40" y="150" width="200" height="280" fill="var(--s-bg)" />
      <rect x="180" y="80" width="180" height="210" fill="var(--s-accent)" />
      <rect x="40" y="150" width="200" height="280" fill="none" stroke="var(--s-text)" strokeWidth="2" />
      <line x1="40" y1="430" x2="360" y2="90" stroke="var(--s-text)" strokeWidth="2" strokeDasharray="8 8" />
    </>
  ),
  auto: (
    <>
      <circle cx="200" cy="270" r="170" fill="var(--s-bg)" />
      <circle cx="200" cy="270" r="170" fill="none" stroke="var(--s-accent)" strokeWidth="26" />
      <circle cx="200" cy="270" r="70" fill="none" stroke="var(--s-text)" strokeOpacity="0.4" strokeWidth="2" />
      {Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <line
            key={i}
            x1={round(200 + Math.cos(a) * 70)}
            y1={round(270 + Math.sin(a) * 70)}
            x2={round(200 + Math.cos(a) * 150)}
            y2={round(270 + Math.sin(a) * 150)}
            stroke="var(--s-text)"
            strokeOpacity="0.4"
            strokeWidth="2"
          />
        );
      })}
      <circle cx="200" cy="270" r="22" fill="var(--s-accent)" />
    </>
  ),
  psychologist: (
    <>
      <circle cx="150" cy="200" r="120" fill="var(--s-accent)" opacity="0.22" />
      <circle cx="250" cy="300" r="120" fill="var(--s-accent)" opacity="0.4" />
      <circle cx="200" cy="250" r="56" fill="var(--s-bg)" />
      <path d="M40 440c60-30 120-30 160 0s100 30 160 0" fill="none" stroke="var(--s-text)" strokeOpacity="0.3" strokeWidth="2" />
    </>
  ),
  coffee: (
    <>
      <circle cx="200" cy="320" r="130" fill="var(--s-accent)" opacity="0.9" />
      <circle cx="200" cy="320" r="96" fill="var(--s-text)" opacity="0.85" />
      <ellipse cx="200" cy="320" rx="42" ry="28" fill="var(--s-surface)" opacity="0.6" />
      {[150, 200, 250].map((x) => (
        <path
          key={x}
          d={`M${x} 170c-20-25 20-45 0-70s20-45 0-70`}
          fill="none"
          stroke="var(--s-text)"
          strokeOpacity="0.3"
          strokeWidth="3"
          strokeLinecap="round"
        />
      ))}
    </>
  ),
};
