import { useState, useMemo } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichEinkaufsartikel } from '@/lib/enrich';
import type { EnrichedEinkaufsartikel } from '@/types/enriched';
import type { Einkaufsliste } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Plus, Pencil, Trash2, CheckCircle2, Circle, ShoppingCart, ListChecks, Users, CalendarDays, ClipboardList } from 'lucide-react';
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

  // State – all hooks BEFORE early returns
  const [selectedListeId, setSelectedListeId] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [artikelDialogOpen, setArtikelDialogOpen] = useState(false);
  const [listeDialogOpen, setListeDialogOpen] = useState(false);
  const [editArtikel, setEditArtikel] = useState<EnrichedEinkaufsartikel | null>(null);
  const [editListe, setEditListe] = useState<Einkaufsliste | null>(null);
  const [deleteArtikelTarget, setDeleteArtikelTarget] = useState<EnrichedEinkaufsartikel | null>(null);
  const [deleteListeTarget, setDeleteListeTarget] = useState<Einkaufsliste | null>(null);
  const [einkaeuferDialogOpen, setEinkaeuferDialogOpen] = useState(false);

  // Derived data – computed after hooks
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
      // Show articles assigned to selected person OR unassigned articles
      return !personId || personId === selectedPersonId;
    });
  }, [enrichedEinkaufsartikel, selectedListeId, selectedPersonId]);

  const todoCount = useMemo(() => enrichedEinkaufsartikel.filter(a => !a.fields.erledigt).length, [enrichedEinkaufsartikel]);
  const doneCount = useMemo(() => enrichedEinkaufsartikel.filter(a => a.fields.erledigt).length, [enrichedEinkaufsartikel]);

  // Always show all lists (no person-based list filtering)
  const filteredEinkaufsliste = useMemo(() => einkaufsliste, [einkaufsliste]);

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
            <Plus size={16} className="shrink-0 mr-1" />
            <span>Neue Liste</span>
          </Button>
          <Button size="sm" onClick={() => { setEditArtikel(null); setArtikelDialogOpen(true); }} disabled={!selectedListeId}>
            <Plus size={16} className="shrink-0 mr-1" />
            <span>Artikel hinzufügen</span>
          </Button>
        </div>
      </div>

      {/* Main workspace: two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">

        {/* Left panel: list of Einkaufslisten */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="font-semibold text-sm text-foreground">Meine Listen</span>
            <span className="text-xs text-muted-foreground">{filteredEinkaufsliste.length} Listen</span>
          </div>

          {filteredEinkaufsliste.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-center px-4">
              <ClipboardList size={36} className="text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Noch keine Einkaufslisten</p>
              {!selectedPersonId && (
                <Button size="sm" variant="outline" onClick={() => { setEditListe(null); setListeDialogOpen(true); }}>
                  <Plus size={14} className="mr-1" />Liste erstellen
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-y-auto flex-1 divide-y divide-border">
              {filteredEinkaufsliste.map(liste => {
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
                      <ShoppingCart size={16} className={isSelected ? 'text-primary' : 'text-muted-foreground'} />
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
                            <CalendarDays size={11} />
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
                    <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => { setEditListe(liste); setListeDialogOpen(true); }}
                        title="Bearbeiten"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        onClick={() => setDeleteListeTarget(liste)}
                        title="Löschen"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right panel: article checklist */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          {!selectedListe ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-4">
              <ListChecks size={48} className="text-muted-foreground/30" />
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
                      <CalendarDays size={12} />
                      {formatDate(selectedListe.fields.datum)}
                    </span>
                  )}
                  <Button size="sm" onClick={() => { setEditArtikel(null); setArtikelDialogOpen(true); }}>
                    <Plus size={14} className="mr-1 shrink-0" />Artikel
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
                  const name = [person.fields.vorname, person.fields.nachname].filter(Boolean).join(' ') || person.fields.kuerzel || 'Unbekannt';
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
                  className="text-xs px-2 py-0.5 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center gap-1"
                  title="Neue Person anlegen"
                >
                  <Plus size={11} className="shrink-0" />
                  <span>Person</span>
                </button>
              </div>

              {artikelForSelectedListe.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
                  <ShoppingCart size={40} className="text-muted-foreground/30" />
                  <div>
                    <p className="font-medium text-foreground">Keine Artikel</p>
                    <p className="text-sm text-muted-foreground mt-1">Diese Liste ist noch leer. Füge Artikel hinzu.</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { setEditArtikel(null); setArtikelDialogOpen(true); }}>
                    <Plus size={14} className="mr-1" />Ersten Artikel hinzufügen
                  </Button>
                </div>
              ) : (
                <div className="overflow-y-auto flex-1">
                  {/* Group: open items */}
                  {artikelForSelectedListe.filter(a => !a.fields.erledigt).length > 0 && (
                    <div>
                      <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30">
                        Noch zu kaufen ({artikelForSelectedListe.filter(a => !a.fields.erledigt).length})
                      </div>
                      {artikelForSelectedListe.filter(a => !a.fields.erledigt).map(artikel => (
                        <ArtikelRow
                          key={artikel.record_id}
                          artikel={artikel}
                          onToggle={() => handleToggleErledigt(artikel)}
                          onEdit={() => { setEditArtikel(artikel); setArtikelDialogOpen(true); }}
                          onDelete={() => setDeleteArtikelTarget(artikel)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Group: done items */}
                  {artikelForSelectedListe.filter(a => a.fields.erledigt).length > 0 && (
                    <div>
                      <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30">
                        Erledigt ({artikelForSelectedListe.filter(a => a.fields.erledigt).length})
                      </div>
                      {artikelForSelectedListe.filter(a => a.fields.erledigt).map(artikel => (
                        <ArtikelRow
                          key={artikel.record_id}
                          artikel={artikel}
                          onToggle={() => handleToggleErledigt(artikel)}
                          onEdit={() => { setEditArtikel(artikel); setArtikelDialogOpen(true); }}
                          onDelete={() => setDeleteArtikelTarget(artikel)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Progress bar */}
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
            // Pre-fill selected list if one is chosen
            const enrichedFields = selectedListeId
              ? { ...fields, liste_ref: createRecordUrl(APP_IDS.EINKAUFSLISTE, selectedListeId) }
              : fields;
            await LivingAppsService.createEinkaufsartikelEntry(enrichedFields);
          }
          fetchAll();
        }}
        defaultValues={editArtikel ? {
          ...editArtikel.fields,
        } : selectedListeId ? {
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

function ArtikelRow({
  artikel,
  onToggle,
  onEdit,
  onDelete,
}: {
  artikel: EnrichedEinkaufsartikel;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isDone = !!artikel.fields.erledigt;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-accent/30 transition-colors group ${isDone ? 'opacity-60' : ''}`}>
      <button
        onClick={onToggle}
        className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
        title={isDone ? 'Als offen markieren' : 'Als erledigt markieren'}
      >
        {isDone
          ? <CheckCircle2 size={20} className="text-primary" />
          : <Circle size={20} />
        }
      </button>

      <div className="flex-1 min-w-0">
        <button
          onClick={onEdit}
          className={`text-sm font-medium text-left hover:underline cursor-pointer ${isDone ? 'line-through text-muted-foreground' : 'text-primary'}`}
        >
          {artikel.fields.artikelname || '—'}
        </button>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {artikel.fields.menge && (
            <span className="text-xs text-muted-foreground">{artikel.fields.menge}</span>
          )}
          {artikel.person_refName && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Users size={11} />
              {artikel.person_refName}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          onClick={onEdit}
          title="Bearbeiten"
        >
          <Pencil size={13} />
        </button>
        <button
          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          onClick={onDelete}
          title="Löschen"
        >
          <Trash2 size={13} />
        </button>
      </div>
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
        <AlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{error.message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>Erneut versuchen</Button>
    </div>
  );
}
