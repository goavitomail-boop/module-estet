/** Темы клиентских сайтов. Гарнитуры подключаются в src/sites/fonts.ts. */
export interface SiteTheme {
  id: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  line: string;
  display: string;
  displayWeight: number;
  body: string;
  radius: string;
  /** Форма фото в первом экране. fade — фото во всю правую часть с растворением в фон. */
  heroShape: "rounded" | "arch" | "sharp" | "fade";
  /** Вид карточек услуг. */
  serviceStyle: "photo" | "arch" | "icon";
}

const t = (theme: SiteTheme) => theme;

export const THEMES: Record<string, SiteTheme> = {
  "nails-light": t({
    id: "nails-light",
    bg: "#FBF5F2",
    surface: "#F3E6E1",
    text: "#2A1E21",
    muted: "#6F5C61",
    accent: "#A84E62",
    accentText: "#FFFFFF",
    line: "#E6D3CD",
    display: "'Cormorant Garamond Variable', Georgia, serif",
    displayWeight: 500,
    body: "'Manrope Variable', system-ui, sans-serif",
    radius: "999px",
    heroShape: "arch",
    serviceStyle: "arch",
  }),
  "nails-dark": t({
    id: "nails-dark",
    bg: "#241B1F",
    surface: "#30252A",
    text: "#F6ECEE",
    muted: "#BFA9AF",
    accent: "#E8A5B4",
    accentText: "#241B1F",
    line: "#45363C",
    display: "'Cormorant Garamond Variable', Georgia, serif",
    displayWeight: 500,
    body: "'Manrope Variable', system-ui, sans-serif",
    radius: "999px",
    heroShape: "arch",
    serviceStyle: "arch",
  }),
  "repair-light": t({
    id: "repair-light",
    bg: "#EDEBE6",
    surface: "#FFFFFF",
    text: "#1C1E21",
    muted: "#55595F",
    accent: "#FF6A13",
    accentText: "#1C1E21",
    line: "#D5D2CB",
    display: "'Oswald Variable', 'Arial Narrow', sans-serif",
    displayWeight: 600,
    body: "'Onest Variable', system-ui, sans-serif",
    radius: "4px",
    heroShape: "sharp",
    serviceStyle: "photo",
  }),
  "repair-dark": t({
    id: "repair-dark",
    bg: "#1C1E21",
    surface: "#26292E",
    text: "#F1EFEA",
    muted: "#A3A7AE",
    accent: "#FFB01F",
    accentText: "#1C1E21",
    line: "#383C42",
    display: "'Oswald Variable', 'Arial Narrow', sans-serif",
    displayWeight: 600,
    body: "'Onest Variable', system-ui, sans-serif",
    radius: "4px",
    heroShape: "sharp",
    serviceStyle: "photo",
  }),
  "auto-dark": t({
    id: "auto-dark",
    bg: "#121417",
    surface: "#1C1F24",
    text: "#F2F3F5",
    muted: "#9AA1AB",
    accent: "#FFD23F",
    accentText: "#121417",
    line: "#2C3037",
    display: "'Rubik Variable', system-ui, sans-serif",
    displayWeight: 700,
    body: "'Rubik Variable', system-ui, sans-serif",
    radius: "10px",
    heroShape: "fade",
    serviceStyle: "icon",
  }),
  "auto-light": t({
    id: "auto-light",
    bg: "#F2F3F5",
    surface: "#FFFFFF",
    text: "#121417",
    muted: "#545B65",
    accent: "#D21F17",
    accentText: "#FFFFFF",
    line: "#DADDE2",
    display: "'Rubik Variable', system-ui, sans-serif",
    displayWeight: 700,
    body: "'Rubik Variable', system-ui, sans-serif",
    radius: "10px",
    heroShape: "rounded",
    serviceStyle: "icon",
  }),
  "psych-sage": t({
    id: "psych-sage",
    bg: "#EEF1EA",
    surface: "#F8FAF5",
    text: "#22302A",
    muted: "#56655D",
    accent: "#3E6B55",
    accentText: "#FFFFFF",
    line: "#D6DDD1",
    display: "'Lora Variable', Georgia, serif",
    displayWeight: 500,
    body: "'Golos Text Variable', system-ui, sans-serif",
    radius: "16px",
    heroShape: "rounded",
    serviceStyle: "icon",
  }),
  "psych-sand": t({
    id: "psych-sand",
    bg: "#F6F0E8",
    surface: "#FFFDF9",
    text: "#2E2620",
    muted: "#6B5F54",
    accent: "#9A5530",
    accentText: "#FFFFFF",
    line: "#E5DACB",
    display: "'Lora Variable', Georgia, serif",
    displayWeight: 500,
    body: "'Golos Text Variable', system-ui, sans-serif",
    radius: "16px",
    heroShape: "rounded",
    serviceStyle: "icon",
  }),
  "coffee-cream": t({
    id: "coffee-cream",
    bg: "#F4ECE0",
    surface: "#FBF6EE",
    text: "#2E1D14",
    muted: "#6E5949",
    accent: "#A65A1E",
    accentText: "#FFFFFF",
    line: "#E2D4C0",
    display: "'Playfair Display Variable', Georgia, serif",
    displayWeight: 600,
    body: "'Onest Variable', system-ui, sans-serif",
    radius: "14px",
    heroShape: "rounded",
    serviceStyle: "photo",
  }),
  "coffee-dark": t({
    id: "coffee-dark",
    bg: "#2A1B14",
    surface: "#36251C",
    text: "#F6EBDD",
    muted: "#C4AE9A",
    accent: "#E9A55B",
    accentText: "#2A1B14",
    line: "#4A3528",
    display: "'Playfair Display Variable', Georgia, serif",
    displayWeight: 600,
    body: "'Onest Variable', system-ui, sans-serif",
    radius: "14px",
    heroShape: "rounded",
    serviceStyle: "photo",
  }),
};

export function getTheme(id: string): SiteTheme {
  return THEMES[id] ?? THEMES["nails-light"];
}
