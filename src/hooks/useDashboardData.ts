import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Einkaufsartikel, Einkaeufer, Einkaufsliste } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [einkaufsartikel, setEinkaufsartikel] = useState<Einkaufsartikel[]>([]);
  const [einkaeufer, setEinkaeufer] = useState<Einkaeufer[]>([]);
  const [einkaufsliste, setEinkaufsliste] = useState<Einkaufsliste[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [einkaufsartikelData, einkaeuferData, einkaufslisteData] = await Promise.all([
        LivingAppsService.getEinkaufsartikel(),
        LivingAppsService.getEinkaeufer(),
        LivingAppsService.getEinkaufsliste(),
      ]);
      setEinkaufsartikel(einkaufsartikelData);
      setEinkaeufer(einkaeuferData);
      setEinkaufsliste(einkaufslisteData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const einkaeuferMap = useMemo(() => {
    const m = new Map<string, Einkaeufer>();
    einkaeufer.forEach(r => m.set(r.record_id, r));
    return m;
  }, [einkaeufer]);

  const einkaufslisteMap = useMemo(() => {
    const m = new Map<string, Einkaufsliste>();
    einkaufsliste.forEach(r => m.set(r.record_id, r));
    return m;
  }, [einkaufsliste]);

  return { einkaufsartikel, setEinkaufsartikel, einkaeufer, setEinkaeufer, einkaufsliste, setEinkaufsliste, loading, error, fetchAll, einkaeuferMap, einkaufslisteMap };
}