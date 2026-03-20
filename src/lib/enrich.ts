import type { EnrichedEinkaufsartikel } from '@/types/enriched';
import type { Einkaeufer, Einkaufsartikel, Einkaufsliste } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface EinkaufsartikelMaps {
  einkaufslisteMap: Map<string, Einkaufsliste>;
  einkaeuferMap: Map<string, Einkaeufer>;
}

export function enrichEinkaufsartikel(
  einkaufsartikel: Einkaufsartikel[],
  maps: EinkaufsartikelMaps
): EnrichedEinkaufsartikel[] {
  return einkaufsartikel.map(r => ({
    ...r,
    liste_refName: resolveDisplay(r.fields.liste_ref, maps.einkaufslisteMap, 'listenname'),
    person_refName: resolveDisplay(r.fields.person_ref, maps.einkaeuferMap, 'vorname', 'nachname'),
  }));
}
