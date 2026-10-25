import type { IconName } from "@/lib/sites/schema";

/** Тонкие линейные иконки для клиентских сайтов. Цвет — currentColor. */
const PATHS: Record<IconName, React.ReactNode> = {
  leaf: <path d="M5 19c0-8 5-14 14-14 0 9-6 14-14 14Zm0 0 7-7" />,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />,
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M9 3v4M15 3v4M8 14h2M14 14h2M8 17h2" />
    </>
  ),
  shield: <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Zm-3 9 2 2 4-4" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="9" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0M15 6.5a3 3 0 0 1 0 5.5M17 19a5 5 0 0 0-2.5-4.3" />
    </>
  ),
  doc: <path d="M7 3h7l4 4v14H7V3Zm7 0v4h4M10 12h5M10 15h5M10 18h3" />,
  camera: (
    <>
      <path d="M4 8h3l2-2.5h6L17 8h3v11H4V8Z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  sprout: <path d="M12 20v-8m0 0C12 8 9 6 5 6c0 4 3 6 7 6Zm0-2c0-3 2-5 6-5 0 3-2 5-6 5" />,
  armchair: <path d="M6 11V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4M4 11a2 2 0 0 1 2 2v2h12v-2a2 2 0 1 1 2 2v3H4v-3a2 2 0 0 1 0-4Zm2 7v2m12-2v2" />,
  bean: (
    <>
      <ellipse cx="12" cy="12" rx="5.5" ry="8" transform="rotate(35 12 12)" />
      <path d="M8.5 17c2-3 1-6 4-10" />
    </>
  ),
  cup: <path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V9Zm11 1h1.5a2.5 2.5 0 0 1 0 5H16M8 3c0 2 1.5 2 1.5 4M12 3c0 2 1.5 2 1.5 4" />,
  wrench: <path d="M14.5 5.5a4 4 0 0 0 4.9 4.9L11 18.8a2 2 0 0 1-2.8-2.8l8.4-8.4M14.5 5.5 17 3l1.5 3.5L22 8l-2.6 2.4" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" />
    </>
  ),
  car: (
    <>
      <path d="M4 16v-4l2-5h12l2 5v4H4Zm0 0v3h3v-3m10 0v3h3v-3M4 12h16" />
      <circle cx="7.5" cy="14" r="0.6" />
      <circle cx="16.5" cy="14" r="0.6" />
    </>
  ),
  oil: <path d="M3 10h4l2-2h5l7 4-6 5H3v-7Zm4 0v7M19 15c0 1.5 1 2.5 1 3.5a1 1 0 0 1-2 0c0-1 1-2 1-3.5Z" />,
  laptop: <path d="M5 6h14v9H5V6Zm-2 12h18M9 9l2 2-2 2m4 0h3" />,
  tire: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 4v5m0 6v5M4 12h5m6 0h5" />
    </>
  ),
  ruler: <path d="M3 17 17 3l4 4L7 21l-4-4Zm4-4 2 2m1-5 2 2m1-5 2 2" />,
  home: <path d="M4 11 12 4l8 7v9h-5v-6H9v6H4v-9Z" />,
  sparkle: <path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7ZM19 16c.3 1.6 1 2.4 2.5 2.5-1.5.3-2.2 1-2.5 2.5-.3-1.5-1-2.2-2.5-2.5 1.5-.1 2.2-.9 2.5-2.5Z" />,
  lock: (
    <>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  phone: <path d="M6 3h3l1.5 4.5L8 9a11 11 0 0 0 7 7l1.5-2.5L21 15v3a2 2 0 0 1-2 2A17 17 0 0 1 4 5a2 2 0 0 1 2-2Z" />,
  pin: (
    <>
      <path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  arrow: <path d="M4 12h15m-5-5 5 5-5 5" />,
  chat: <path d="M5 5h14v10H10l-4 4v-4H5V5Zm4 5h.01M12 10h.01M15 10h.01" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3 10h18M7 15h4" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.4-3.5-8.5s1-5.9 3.5-8.5Z" />
    </>
  ),
  bolt: <path d="M13 3 5 13.5h6L10 21l8-10.5h-6L13 3Z" />,
  play: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m10 8.5 5 3.5-5 3.5v-7Z" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  layers: <path d="m12 4 8.5 4.5L12 13 3.5 8.5 12 4Zm-8.5 8L12 16.5 20.5 12M3.5 15.5 12 20l8.5-4.5" />,
  mobile: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
  palette: <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 1.8-1 1.3-2-.6-1.2.2-2.5 1.6-2.5H17a3.5 3.5 0 0 0 3.5-3.5c0-5-3.8-9-8.5-9ZM7.5 11h.01M10 7.5h.01M14.5 7.5h.01" />,
  text: <path d="M5 6h14M5 10h10M5 14h14M5 18h8" />,
  plus: <path d="M12 5v14M5 12h14" />,
};

export function Icon({ name, size = 24, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}
