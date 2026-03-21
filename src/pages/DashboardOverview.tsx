import { useState, useMemo, useEffect } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichEinkaufsartikel } from '@/lib/enrich';
import type { EnrichedEinkaufsartikel } from '@/types/enriched';
import type { Einkaufsliste, Einkaeufer } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import {
  IconAlertCircle,
  IconPlus,
  IconShoppingCart,
  IconListCheck,
  IconCalendar,
  IconClipboardList,
  IconHandFinger,
  IconX,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EinkaufsartikelDialog } from '@/components/dialogs/EinkaufsartikelDialog';
import { EinkaufslisteDialog } from '@/components/dialogs/EinkaufslisteDialog';
import { EinkaeuferDialog } from '@/components/dialogs/EinkaeuferDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN } from '@/config/ai-features';

export default function DashboardOverview() {
  const {
    einkaufsartikel, einkaeufer, einkaufsliste,
    einkaeuferMap, einkaufslisteMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedEinkaufsartikel = enrichEinkaufsartikel(einkaufsartikel, { einkaufslisteMap, einkaeuferMap });

  // ALL hooks BEFORE early returns
  const [selectedListeId, setSelectedListeId] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [artikelDialogOpen, setArtikelDialogOpen] = useState(false);
  const [listeDialogOpen, setListeDialogOpen] = useState(false);
  const [editArtikel, setEditArtikel] = useState<EnrichedEinkaufsartikel | null>(null);
  const [editListe, setEditListe] = useState<Einkaufsliste | null>(null);
  const [deleteArtikelTarget, setDeleteArtikelTarget] = useState<EnrichedEinkaufsartikel | null>(null);
  const [deleteListeTarget, setDeleteListeTarget] = useState<Einkaufsliste | null>(null);
  const [einkaeuferDialogOpen, setEinkaeuferDialogOpen] = useState(false);
  const [listePage, setListePage] = useState(0);

  const LISTS_PER_PAGE = 2;

  const sortedEinkaufsliste = useMemo(() => {
    return [...einkaufsliste].sort((a, b) => {
      const dateA = a.fields.datum ? new Date(a.fields.datum).getTime() : 0;
      const dateB = b.fields.datum ? new Date(b.fields.datum).getTime() : 0;
      return dateB - dateA;
    });
  }, [einkaufsliste]);

  useEffect(() => {
    if (sortedEinkaufsliste.length > 0 && selectedListeId === null) {
      setSelectedListeId(sortedEinkaufsliste[0].record_id);
    }
  }, [sortedEinkaufsliste, selectedListeId]);

  const totalPages = Math.ceil(sortedEinkaufsliste.length / LISTS_PER_PAGE);
  const pagedEinkaufsliste = sortedEinkaufsliste.slice(listePage * LISTS_PER_PAGE, (listePage + 1) * LISTS_PER_PAGE);

  const selectedListe = useMemo(
    () => einkaufsliste.find(l => l.record_id === selectedListeId) ?? null,
    [einkaufsliste, selectedListeId]
  );

  const artikelForSelectedListe = useMemo(() => {
    if (!selectedListeId) return [];
    return enrichedEinkaufsartikel.filter(a => {
      const listeId = extractRecordId(a.fields.liste_ref);
      if (listeId !== selectedListeId) return false;
      if (!selectedPersonId) return true;
      const personId = extractRecordId(a.fields.person_ref);
      return !personId || personId === selectedPersonId;
    });
  }, [enrichedEinkaufsartikel, selectedListeId, selectedPersonId]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  // Handlers
  const handleToggleErledigt = async (artikel: EnrichedEinkaufsartikel) => {
    await LivingAppsService.updateEinkaufsartikelEntry(artikel.record_id, {
      erledigt: !artikel.fields.erledigt,
    });
    fetchAll();
  };

  const handleDeleteArtikel = async () => {
    if (!deleteArtikelTarget) return;
    await LivingAppsService.deleteEinkaufsartikelEntry(deleteArtikelTarget.record_id);
    setDeleteArtikelTarget(null);
    fetchAll();
  };

  // Assign the currently filtered person to an article
  const handleAssignPerson = async (artikel: EnrichedEinkaufsartikel, personId: string) => {
    await LivingAppsService.updateEinkaufsartikelEntry(artikel.record_id, {
      person_ref: createRecordUrl(APP_IDS.EINKAEUFER, personId),
    });
    fetchAll();
  };

  // Remove person assignment from an article — send null so the API actually clears the field
  const handleUnassignPerson = async (artikel: EnrichedEinkaufsartikel) => {
    await LivingAppsService.updateEinkaufsartikelEntry(artikel.record_id, { person_ref: null as unknown as undefined });
    fetchAll();
  };

  const handleDeleteListe = async () => {
    if (!deleteListeTarget) return;
    await LivingAppsService.deleteEinkaufslisteEntry(deleteListeTarget.record_id);
    if (selectedListeId === deleteListeTarget.record_id) setSelectedListeId(null);
    setDeleteListeTarget(null);
    fetchAll();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Einkaufslisten</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Verwalte deine Einkaufslisten und Artikel</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setEditListe(null); setListeDialogOpen(true); }}>
            <IconPlus size={16} className="shrink-0 mr-1" />
            <span>Neue Liste</span>
          </Button>
          <Button size="sm" onClick={() => { setEditArtikel(null); setArtikelDialogOpen(true); }} disabled={!selectedListeId}>
            <IconPlus size={16} className="shrink-0 mr-1" />
            <span>Artikel hinzufügen</span>
          </Button>
        </div>
      </div>

      {/* Main workspace: two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">

        {/* Left panel: Einkaufslisten */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="font-semibold text-sm text-foreground">Meine Listen</span>
            <span className="text-xs text-muted-foreground">{sortedEinkaufsliste.length} Listen</span>
          </div>

          {sortedEinkaufsliste.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-center px-4">
              <IconClipboardList size={36} className="text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Noch keine Einkaufslisten</p>
              <Button size="sm" variant="outline" onClick={() => { setEditListe(null); setListeDialogOpen(true); }}>
                <IconPlus size={14} className="mr-1" />Liste erstellen
              </Button>
            </div>
          ) : (
            <>
              <div className="divide-y divide-border flex-1">
                {pagedEinkaufsliste.map(liste => {
                  const listeArtikel = enrichedEinkaufsartikel.filter(a => extractRecordId(a.fields.liste_ref) === liste.record_id);
                  const offenCount = listeArtikel.filter(a => !a.fields.erledigt).length;
                  const totalCount = listeArtikel.length;
                  const isSelected = selectedListeId === liste.record_id;

                  return (
                    <button
                      key={liste.record_id}
                      onClick={() => setSelectedListeId(isSelected ? null : liste.record_id)}
                      className={`w-full text-left px-4 py-3 transition-colors hover:bg-accent/50 flex items-start gap-3 ${
                        isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        <IconShoppingCart size={16} className={isSelected ? 'text-primary' : 'text-muted-foreground'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className="font-medium text-sm truncate text-primary hover:underline cursor-pointer"
                          onClick={e => { e.stopPropagation(); setEditListe(liste); setListeDialogOpen(true); }}
                        >{liste.fields.listenname || 'Ohne Namen'}</div>
                        {liste.fields.beschreibung && (
                          <div className="text-xs text-muted-foreground truncate mt-0.5">{liste.fields.beschreibung}</div>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {liste.fields.datum && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <IconCalendar size={11} />
                              {formatDate(liste.fields.datum)}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {offenCount > 0 ? (
                              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">{offenCount} offen</Badge>
                            ) : totalCount > 0 ? (
                              <Badge variant="outline" className="text-xs px-1.5 py-0 h-4 text-green-600 border-green-300">Alle erledigt</Badge>
                            ) : (
                              <span className="text-muted-foreground/60">Leer</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="px-4 py-2 border-t border-border flex items-center justify-between gap-2 bg-muted/20">
                  <button
                    onClick={() => setListePage(p => Math.max(0, p - 1))}
                    disabled={listePage === 0}
                    className="text-xs px-2.5 py-1 rounded border border-border text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ‹ Zurück
                  </button>
                  <span className="text-xs text-muted-foreground">{listePage + 1} / {totalPages}</span>
                  <button
                    onClick={() => setListePage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={listePage >= totalPages - 1}
                    className="text-xs px-2.5 py-1 rounded border border-border text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Weiter ›
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right panel: article checklist */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          {!selectedListe ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-4">
              <IconListCheck size={48} className="text-muted-foreground/30" />
              <div>
                <p className="font-medium text-foreground">Liste auswählen</p>
                <p className="text-sm text-muted-foreground mt-1">Wähle links eine Einkaufsliste, um die Artikel zu sehen und zu verwalten.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-semibold text-foreground truncate">{selectedListe.fields.listenname || 'Ohne Namen'}</h2>
                  {selectedListe.fields.beschreibung && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{selectedListe.fields.beschreibung}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {selectedListe.fields.datum && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <IconCalendar size={12} />
                      {formatDate(selectedListe.fields.datum)}
                    </span>
                  )}
                  <Button size="sm" onClick={() => { setEditArtikel(null); setArtikelDialogOpen(true); }}>
                    <IconPlus size={14} className="mr-1 shrink-0" />Artikel
                  </Button>
                </div>
              </div>

              {/* Person filter */}
              <div className="px-4 py-2 border-b border-border flex flex-wrap items-center gap-2 bg-muted/20">
                <span className="text-xs text-muted-foreground shrink-0">Person:</span>
                {einkaeufer.length > 0 && (
                  <button
                    onClick={() => setSelectedPersonId(null)}
                    className={`text-xs px-2.5 py-0.5 rounded-full border transition-colors ${
                      !selectedPersonId
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
                    }`}
                  >
                    Alle
                  </button>
                )}
                {einkaeufer.map(person => {
                  const name = person.fields.kuerzel || [person.fields.vorname, person.fields.nachname].filter(Boolean).join(' ') || 'Unbekannt';
                  const isActive = selectedPersonId === person.record_id;
                  return (
                    <button
                      key={person.record_id}
                      onClick={() => setSelectedPersonId(isActive ? null : person.record_id)}
                      className={`text-xs px-2.5 py-0.5 rounded-full border transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
                <button
                  onClick={() => setEinkaeuferDialogOpen(true)}
                  className="w-6 h-6 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center shrink-0"
                  title="Neue Person anlegen"
                >
                  <IconPlus size={12} className="shrink-0" />
                </button>
              </div>

              {artikelForSelectedListe.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
                  <IconShoppingCart size={40} className="text-muted-foreground/30" />
                  <div>
                    <p className="font-medium text-foreground">Keine Artikel</p>
                    <p className="text-sm text-muted-foreground mt-1">Diese Liste ist noch leer. Füge Artikel hinzu.</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { setEditArtikel(null); setArtikelDialogOpen(true); }}>
                    <IconPlus size={14} className="mr-1" />Ersten Artikel hinzufügen
                  </Button>
                </div>
              ) : (
                <div className="overflow-y-auto flex-1">
                  {artikelForSelectedListe.filter(a => !a.fields.erledigt).length > 0 && (
                    <div>
                      <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30">
                        Noch zu kaufen ({artikelForSelectedListe.filter(a => !a.fields.erledigt).length})
                      </div>
                      {artikelForSelectedListe.filter(a => !a.fields.erledigt).map(artikel => (
                        <ArtikelRow
                          key={artikel.record_id}
                          artikel={artikel}
                          einkaeuferMap={einkaeuferMap}
                          selectedPersonId={selectedPersonId}
                          onToggle={() => handleToggleErledigt(artikel)}
                          onEdit={() => { setEditArtikel(artikel); setArtikelDialogOpen(true); }}
                          onAssignPerson={(personId) => handleAssignPerson(artikel, personId)}
                          onUnassignPerson={() => handleUnassignPerson(artikel)}
                        />
                      ))}
                    </div>
                  )}

                  {artikelForSelectedListe.filter(a => a.fields.erledigt).length > 0 && (
                    <div>
                      <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30">
                        Erledigt ({artikelForSelectedListe.filter(a => a.fields.erledigt).length})
                      </div>
                      {artikelForSelectedListe.filter(a => a.fields.erledigt).map(artikel => (
                        <ArtikelRow
                          key={artikel.record_id}
                          artikel={artikel}
                          einkaeuferMap={einkaeuferMap}
                          selectedPersonId={selectedPersonId}
                          onToggle={() => handleToggleErledigt(artikel)}
                          onEdit={() => { setEditArtikel(artikel); setArtikelDialogOpen(true); }}
                          onAssignPerson={(personId) => handleAssignPerson(artikel, personId)}
                          onUnassignPerson={() => handleUnassignPerson(artikel)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {artikelForSelectedListe.length > 0 && (
                <div className="px-4 py-3 border-t border-border bg-muted/20">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span>{artikelForSelectedListe.filter(a => a.fields.erledigt).length} von {artikelForSelectedListe.length} erledigt</span>
                    <span>{Math.round(artikelForSelectedListe.filter(a => a.fields.erledigt).length / artikelForSelectedListe.length * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${artikelForSelectedListe.filter(a => a.fields.erledigt).length / artikelForSelectedListe.length * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <EinkaufsartikelDialog
        open={artikelDialogOpen}
        onClose={() => { setArtikelDialogOpen(false); setEditArtikel(null); }}
        onSubmit={async (fields) => {
          if (editArtikel) {
            await LivingAppsService.updateEinkaufsartikelEntry(editArtikel.record_id, fields);
          } else {
            const enrichedFields = selectedListeId
              ? { ...fields, liste_ref: createRecordUrl(APP_IDS.EINKAUFSLISTE, selectedListeId) }
              : fields;
            await LivingAppsService.createEinkaufsartikelEntry(enrichedFields);
          }
          fetchAll();
        }}
        defaultValues={editArtikel ? { ...editArtikel.fields } : selectedListeId ? {
          liste_ref: createRecordUrl(APP_IDS.EINKAUFSLISTE, selectedListeId),
        } : undefined}
        einkaufslisteList={einkaufsliste}
        einkaeuferList={einkaeufer}
        enablePhotoScan={AI_PHOTO_SCAN['Einkaufsartikel']}
      />

      <EinkaufslisteDialog
        open={listeDialogOpen}
        onClose={() => { setListeDialogOpen(false); setEditListe(null); }}
        onSubmit={async (fields) => {
          if (editListe) {
            await LivingAppsService.updateEinkaufslisteEntry(editListe.record_id, fields);
          } else {
            await LivingAppsService.createEinkaufslisteEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editListe?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Einkaufsliste']}
      />

      <EinkaeuferDialog
        open={einkaeuferDialogOpen}
        onClose={() => setEinkaeuferDialogOpen(false)}
        onSubmit={async (fields) => {
          await LivingAppsService.createEinkaeuferEntry(fields);
          fetchAll();
        }}
        enablePhotoScan={AI_PHOTO_SCAN['Einkaeufer']}
      />

      <ConfirmDialog
        open={!!deleteArtikelTarget}
        title="Artikel löschen"
        description={`"${deleteArtikelTarget?.fields.artikelname || 'Dieser Artikel'}" wirklich löschen?`}
        onConfirm={handleDeleteArtikel}
        onClose={() => setDeleteArtikelTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteListeTarget}
        title="Einkaufsliste löschen"
        description={`"${deleteListeTarget?.fields.listenname || 'Diese Liste'}" und alle zugehörigen Daten wirklich löschen?`}
        onConfirm={handleDeleteListe}
        onClose={() => setDeleteListeTarget(null)}
      />
    </div>
  );
}

// ArtikelRow: shows Hand icon (assign) or X icon (unassign) when a person filter is active
function ArtikelRow({
  artikel,
  einkaeuferMap,
  selectedPersonId,
  onToggle,
  onEdit,
  onAssignPerson,
  onUnassignPerson,
}: {
  artikel: EnrichedEinkaufsartikel;
  einkaeuferMap: Map<string, Einkaeufer>;
  selectedPersonId: string | null;
  onToggle: () => void;
  onEdit: () => void;
  onAssignPerson: (personId: string) => void;
  onUnassignPerson: () => void;
}) {
  const isDone = !!artikel.fields.erledigt;
  const assignedPersonId = extractRecordId(artikel.fields.person_ref);

  const personKuerzel = (() => {
    if (!assignedPersonId) return '';
    const person = einkaeuferMap.get(assignedPersonId);
    return person?.fields.kuerzel || '';
  })();

  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-accent/30 transition-colors ${isDone ? 'opacity-60' : ''}`}>
      {/* Checkbox toggle */}
      <button
        onClick={onToggle}
        className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
        title={isDone ? 'Als offen markieren' : 'Als erledigt markieren'}
      >
        {isDone
          ? <div className="w-5 h-5 rounded-sm bg-primary flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          : <div className="w-5 h-5 rounded-sm border-2 border-muted-foreground/40" />
        }
      </button>

      {/* Article name + quantity */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <button
          onClick={onEdit}
          className={`text-sm font-medium text-left hover:underline cursor-pointer truncate ${isDone ? 'line-through text-muted-foreground' : 'text-primary'}`}
        >
          {artikel.fields.artikelname || '—'}
        </button>
        {artikel.fields.menge && (
          <span className="text-xs text-muted-foreground shrink-0">{artikel.fields.menge}</span>
        )}
      </div>

      {/* Person kürzel badge */}
      {personKuerzel && (
        <span className="text-xs text-muted-foreground shrink-0 font-mono font-semibold">
          {personKuerzel}
        </span>
      )}

      {/* Person filter active: show Hand (no person) or X (has person) */}
      {selectedPersonId !== null && (
        assignedPersonId === null ? (
          <button
            onClick={() => onAssignPerson(selectedPersonId)}
            className="shrink-0 p-1 rounded text-primary/60 hover:text-primary hover:bg-primary/10 transition-colors"
            title="Gefilterte Person zuordnen"
          >
            <IconHandFinger size={16} />
          </button>
        ) : (
          <button
            onClick={onUnassignPerson}
            className="shrink-0 p-1 rounded text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Personenzuordnung entfernen"
          >
            <IconX size={16} />
          </button>
        )
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{error.message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>Erneut versuchen</Button>
    </div>
  );
}
