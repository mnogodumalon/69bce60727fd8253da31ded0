// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Einkaufsartikel {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    artikelname?: string;
    menge?: string;
    liste_ref?: string; // applookup -> URL zu 'Einkaufsliste' Record
    person_ref?: string; // applookup -> URL zu 'Einkaeufer' Record
    erledigt?: boolean;
  };
}

export interface Einkaeufer {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    kuerzel?: string;
  };
}

export interface Einkaufsliste {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    listenname?: string;
    beschreibung?: string;
    datum?: string; // Format: YYYY-MM-DD oder ISO String
  };
}

export const APP_IDS = {
  EINKAUFSARTIKEL: '69bce5f8550beea6f03c7e74',
  EINKAEUFER: '69bce5f2e35329c5b58c58a3',
  EINKAUFSLISTE: '69bce5f85c5d7cbd7a1ef4ae',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'einkaufsartikel': {
    'artikelname': 'string/text',
    'menge': 'string/text',
    'liste_ref': 'applookup/select',
    'person_ref': 'applookup/select',
    'erledigt': 'bool',
  },
  'einkaeufer': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'kuerzel': 'string/text',
  },
  'einkaufsliste': {
    'listenname': 'string/text',
    'beschreibung': 'string/textarea',
    'datum': 'date/date',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateEinkaufsartikel = StripLookup<Einkaufsartikel['fields']>;
export type CreateEinkaeufer = StripLookup<Einkaeufer['fields']>;
export type CreateEinkaufsliste = StripLookup<Einkaufsliste['fields']>;