import type { Brief, NicheId } from "../schema";
import { auto } from "./auto";
import { barber } from "./barber";
import { cleaning } from "./cleaning";
import { coffee } from "./coffee";
import { dental } from "./dental";
import { fitness } from "./fitness";
import { florist } from "./florist";
import { legal } from "./legal";
import { nails } from "./nails";
import { photo } from "./photo";
import { psychologist } from "./psychologist";
import { repair } from "./repair";
import type { Niche } from "./types";

export type { Niche } from "./types";

export const NICHES: Record<NicheId, Niche> = {
  coffee,
  nails,
  repair,
  auto,
  psychologist,
  fitness,
  legal,
  barber,
  cleaning,
  dental,
  photo,
  florist,
};

export const NICHE_LIST = Object.values(NICHES);

export function demoBrief(id: NicheId): Brief {
  return { niche: id, ...NICHES[id].demo };
}
