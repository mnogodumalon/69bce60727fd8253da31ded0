import type { Einkaufsartikel } from './app';

export type EnrichedEinkaufsartikel = Einkaufsartikel & {
  liste_refName: string;
  person_refName: string;
};
