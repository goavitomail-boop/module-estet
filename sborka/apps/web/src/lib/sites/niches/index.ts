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
import { other } from "./other";
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
  other,
};

export const NICHE_LIST = Object.values(NICHES);

/** Бриф демо-бизнеса с теми же значениями по умолчанию, что у схемы. Без zod — модуль попадает в код главной. */
export function demoBrief(id: NicheId): Brief {
  return { about: "", address: "", hours: "", wishes: "", kind: "", flow: "booking", ...NICHES[id].demo, niche: id };
}
