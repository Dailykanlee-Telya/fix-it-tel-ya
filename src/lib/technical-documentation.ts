// Technical Documentation Content for PDF Export
// Structured data for the complete system documentation

export interface DocSection {
  id: string;
  title: string;
  content: string;
  code?: { language: string; code: string; title?: string }[];
  tables?: { headers: string[]; rows: string[][] }[];
}

export interface DocChapter {
  id: string;
  number: string;
  title: string;
  sections: DocSection[];
}

export const DOCUMENTATION_META = {
  title: "Technische Systemdokumentation",
  subtitle: "Reparatur- & B2B-Management System",
  version: "1.0.0",
  date: "Januar 2026",
  company: "Telya GmbH",
  description: "Vollständige technische Beschreibung für Nachbau und Wartung"
};

export const DOCUMENTATION_CHAPTERS: DocChapter[] = [
  {
    id: "system-overview",
    number: "1",
    title: "System-Überblick",
    sections: [
      {
        id: "purpose",
        title: "1.1 Zweck des Systems",
        content: `Das System ist eine webbasierte Reparaturverwaltung für Mobilgeräte (Smartphones, Tablets, Laptops) mit integriertem B2B-Partner-Portal. Es deckt den gesamten Reparatur-Lebenszyklus ab: von der Annahme über Diagnose und Kostenvoranschlag bis zur Fertigstellung und Auslieferung.

Kernfunktionen:
• Auftragsannahme (Intake) mit Geräte- und Kundendaten
• Werkstatt-Workflow mit Status-Tracking
• Kostenvoranschlag (KVA) mit Kunden-Freigabe
• B2B-Partner-Portal für Großkunden
• Dokumentenerstellung (Eingangsbeleg, Reparaturbericht)
• Ersatzteil- und Lagerverwaltung
• Rollen- und Rechtemanagement`
      },
      {
        id: "target-groups",
        title: "1.2 Zielgruppen",
        content: `Das System bedient vier Hauptzielgruppen:

1. ENDKUNDE (öffentlich)
   • Zugriff nur auf Tracking-Seite mit Ticket-Code
   • Kann Status einsehen und auf KVA reagieren
   • Kein Login erforderlich

2. INTERNE MITARBEITER
   • Theke: Annahme, Kundenservice
   • Techniker: Diagnose, Reparatur
   • Filialleiter: Standort-Übersicht
   • Admin: Vollzugriff, Konfiguration

3. B2B-PARTNER (separates Portal)
   • B2B Inhaber: Vollzugriff auf Partner-Daten
   • B2B Admin: Benutzerverwaltung
   • B2B User: Aufträge anlegen/verfolgen

4. SYSTEM-ADMINISTRATOR
   • Mandantenverwaltung
   • Berechtigungssteuerung
   • Systemkonfiguration`
      },
      {
        id: "architecture",
        title: "1.3 Architektur-Übersicht",
        content: `Technologie-Stack:
• Frontend: React 19 + TypeScript + Vite
• UI: Tailwind CSS + shadcn/ui
• Backend: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
• State: TanStack Query (React Query)
• Routing: React Router v7

Deployment:
• Frontend: Lovable Cloud
• Backend: Supabase Cloud
• CDN: Automatisch via Lovable

Sicherheitsarchitektur:
• Row Level Security (RLS) auf allen Tabellen
• JWT-basierte Authentifizierung
• Mandantentrennung via b2b_partner_id`
      }
    ]
  },
  {
    id: "roles-permissions",
    number: "2",
    title: "Rollen & Rechte",
    sections: [
      {
        id: "role-overview",
        title: "2.1 Rollen-Übersicht",
        content: `Das System verwendet ein rollenbasiertes Berechtigungssystem mit zwei Ebenen:
1. App-Rollen (app_role ENUM) - bestimmen den Benutzertyp
2. Berechtigungen (permissions) - feinkörnige Zugriffsrechte

Interne Rollen:
• ADMIN - Vollzugriff auf alle Bereiche
• FILIALLEITER - Standort-bezogene Verwaltung
• TECHNIKER - Werkstatt-Zugriff, Diagnose, Reparatur
• THEKE - Annahme, Kundenservice, Dokumente
• BUCHHALTUNG - Finanzberichte, Preise (nur lesen)

B2B-Rollen:
• B2B_INHABER - Partner-Owner, volle Partner-Rechte
• B2B_ADMIN - Partner-Benutzerverwaltung
• B2B_USER - Basis-Zugriff auf Partner-Portal`,
        tables: [
          {
            headers: ["Rolle", "Dashboard", "Tickets", "KVA", "Werkstatt", "Teile", "Kunden", "Einstellungen"],
            rows: [
              ["ADMIN", "✓", "Alle", "Alle", "✓", "✓ Schreiben", "✓ Alle", "✓ Voll"],
              ["FILIALLEITER", "✓", "Standort", "Standort", "✓", "✓ Lesen", "✓ Standort", "✓ Standort"],
              ["TECHNIKER", "✓", "Zugewiesene", "Erstellen", "✓", "✓ Lesen", "✗", "✗"],
              ["THEKE", "✓", "Standort", "Lesen", "✗", "✓ Lesen", "✓ Standort", "✗"],
              ["B2B_INHABER", "B2B", "Eigene", "Eigene", "✗", "✗", "Eigene", "Partner"],
              ["B2B_USER", "B2B", "Eigene", "Lesen", "✗", "✗", "Eigene", "✗"]
            ]
          }
        ]
      },
      {
        id: "permission-keys",
        title: "2.2 Berechtigungs-Schlüssel",
        content: `Die granularen Berechtigungen werden in der Tabelle 'permissions' definiert und über 'role_permissions' den Rollen zugeordnet.`,
        code: [
          {
            language: "sql",
            title: "Wichtige Permission-Keys",
            code: `-- Ticket-Berechtigungen
VIEW_DASHBOARD
VIEW_INTAKE
VIEW_WORKSHOP
VIEW_TICKET_DETAILS
EDIT_TICKET_STATUS
ASSIGN_TECHNICIAN

-- KVA-Berechtigungen
CREATE_KVA
APPROVE_KVA
VIEW_INTERNAL_PRICES

-- Verwaltung
MANAGE_USERS
MANAGE_SETTINGS
MANAGE_B2B_PARTNERS
MANAGE_PERMISSIONS
VIEW_REPORTS`
          }
        ]
      },
      {
        id: "rls-role-check",
        title: "2.3 RLS-Rollenfunktionen",
        content: `Die Rollenprüfung erfolgt serverseitig über SQL-Funktionen:`,
        code: [
          {
            language: "sql",
            title: "Rollen-Hilfsfunktionen",
            code: `-- Prüft ob User eine bestimmte Rolle hat
CREATE FUNCTION public.has_role(check_role app_role)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = check_role
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Prüft ob User B2B-Partner ist
CREATE FUNCTION public.is_b2b_user()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND b2b_partner_id IS NOT NULL
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Gibt B2B-Partner-ID des Users zurück
CREATE FUNCTION public.get_user_b2b_partner_id()
RETURNS uuid AS $$
  SELECT b2b_partner_id FROM public.profiles
  WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;`
          }
        ]
      }
    ]
  },
  {
    id: "data-model",
    number: "3",
    title: "Datenmodell",
    sections: [
      {
        id: "core-tables",
        title: "3.1 Kern-Tabellen",
        content: `Die zentralen Tabellen des Systems:`,
        tables: [
          {
            headers: ["Tabelle", "Zweck", "Wichtige Felder", "RLS"],
            rows: [
              ["repair_tickets", "Reparaturaufträge", "ticket_number, status, customer_id, device_id, b2b_partner_id", "Mandantentrennung"],
              ["customers", "Kundenstamm", "first_name, last_name, phone, email", "Nur authentifizierte"],
              ["devices", "Gerätedaten", "brand, model, imei_or_serial, device_type", "Via customer_id"],
              ["kva_estimates", "Kostenvoranschläge", "repair_cost, parts_cost, status, decision", "Via ticket"],
              ["b2b_partners", "B2B-Mandanten", "name, code, contact_email, is_active", "Eigene Daten"],
              ["b2b_customers", "Endkunden von B2B", "b2b_partner_id, first_name, last_name", "Mandantentrennung"]
            ]
          }
        ]
      },
      {
        id: "ticket-schema",
        title: "3.2 Repair Tickets Schema",
        content: `Die repair_tickets Tabelle ist das Herzstück des Systems:`,
        code: [
          {
            language: "sql",
            title: "repair_tickets Struktur",
            code: `CREATE TABLE public.repair_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE,
  
  -- Beziehungen
  customer_id UUID NOT NULL REFERENCES customers(id),
  device_id UUID NOT NULL REFERENCES devices(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  assigned_technician_id UUID REFERENCES profiles(id),
  
  -- B2B-Felder (optional)
  is_b2b BOOLEAN DEFAULT false,
  b2b_partner_id UUID REFERENCES b2b_partners(id),
  b2b_customer_id UUID REFERENCES b2b_customers(id),
  
  -- Status & Workflow
  status ticket_status NOT NULL DEFAULT 'NEU',
  priority TEXT,
  kva_required BOOLEAN DEFAULT false,
  kva_approved BOOLEAN,
  
  -- Preise
  price_mode price_mode DEFAULT 'STANDARD',
  estimated_price NUMERIC,
  final_price NUMERIC,
  internal_price NUMERIC,        -- EK für B2B
  endcustomer_price NUMERIC,     -- VK für Endkunde
  
  -- Gerätezustand
  error_code error_code,
  error_description_text TEXT,
  device_condition_at_intake JSONB,
  passcode_type TEXT,
  passcode_pin TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);`
          }
        ]
      },
      {
        id: "kva-schema",
        title: "3.3 KVA Schema",
        content: `Kostenvoranschläge werden versioniert gespeichert:`,
        code: [
          {
            language: "sql",
            title: "kva_estimates Struktur",
            code: `CREATE TABLE public.kva_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_ticket_id UUID NOT NULL REFERENCES repair_tickets(id),
  
  -- Versionierung
  version INTEGER DEFAULT 1,
  is_current BOOLEAN DEFAULT true,
  parent_kva_id UUID REFERENCES kva_estimates(id),
  
  -- Kosten
  repair_cost NUMERIC,           -- Arbeitskosten
  parts_cost NUMERIC,            -- Teilekosten
  total_cost NUMERIC,            -- Gesamtkosten
  internal_price NUMERIC,        -- EK (nur intern/B2B sichtbar)
  endcustomer_price NUMERIC,     -- VK (für Endkunde)
  
  -- Status
  status kva_status DEFAULT 'OFFEN',
  decision kva_status,
  decision_at TIMESTAMPTZ,
  decision_channel kva_approval_channel,
  
  -- Inhalt
  diagnosis TEXT,
  repair_description TEXT,
  disposal_option TEXT,
  
  -- Gebühren
  kva_fee_amount NUMERIC,
  kva_fee_waived BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ
);`
          }
        ]
      },
      {
        id: "b2b-schema",
        title: "3.4 B2B-Tabellen",
        content: `B2B-spezifische Tabellen für Mandantenfähigkeit:`,
        code: [
          {
            language: "sql",
            title: "B2B Partner & Kunden",
            code: `-- B2B Partner (Mandanten)
CREATE TABLE public.b2b_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,              -- Kurzcode z.B. "MEDIAMARKT"
  
  -- Kontakt
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  
  -- Adresse
  street TEXT,
  zip TEXT,
  city TEXT,
  country TEXT DEFAULT 'DE',
  
  -- Branding (Whitelabel)
  company_logo_url TEXT,
  primary_color TEXT,
  legal_footer TEXT,
  document_texts JSONB,          -- Custom Dokument-Texte
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  location_id UUID REFERENCES locations(id),
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- B2B Endkunden (gehören zum Partner)
CREATE TABLE public.b2b_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  b2b_partner_id UUID NOT NULL REFERENCES b2b_partners(id),
  
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  
  -- Adresse
  street TEXT,
  house_number TEXT,
  zip TEXT,
  city TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);`
          }
        ]
      },
      {
        id: "messaging-schema",
        title: "3.5 Nachrichten-System",
        content: `Das Messaging-System unterscheidet drei Nachrichtentypen:`,
        code: [
          {
            language: "sql",
            title: "ticket_messages Struktur",
            code: `CREATE TABLE public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_ticket_id UUID NOT NULL REFERENCES repair_tickets(id),
  
  -- Typ bestimmt Sichtbarkeit
  message_type TEXT NOT NULL CHECK (
    message_type IN ('internal_note', 'b2b_message', 'customer_message')
  ),
  
  message_text TEXT NOT NULL,
  sender_id UUID REFERENCES profiles(id),
  is_from_customer BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sichtbarkeitsregeln:
-- internal_note:    Nur interne Mitarbeiter
-- b2b_message:      B2B-Partner + interne Mitarbeiter  
-- customer_message: Alle (inkl. Endkunde via Tracking)`
          }
        ]
      }
    ]
  },
  {
    id: "status-workflow",
    number: "4",
    title: "Status- & Workflow-Logik",
    sections: [
      {
        id: "status-enum",
        title: "4.1 Status-Definitionen",
        content: `Der Ticket-Status wird als ENUM verwaltet:`,
        code: [
          {
            language: "sql",
            title: "ticket_status ENUM",
            code: `CREATE TYPE ticket_status AS ENUM (
  'NEU',                    -- Gerade erstellt
  'EINGEGANGEN',            -- Angenommen
  'IN_DIAGNOSE',            -- Techniker prüft
  'WARTET_AUF_FREIGABE',    -- KVA erstellt, wartet
  'FREIGEGEBEN',            -- Kunde hat genehmigt
  'IN_REPARATUR',           -- Wird repariert
  'QUALITAETSKONTROLLE',    -- QK vor Ausgabe
  'FERTIG',                 -- Bereit zur Abholung
  'ABGESCHLOSSEN',          -- Abgeholt/versendet
  'STORNIERT',              -- Abgebrochen
  'ENTSORGUNG'              -- Zur Entsorgung
);`
          }
        ],
        tables: [
          {
            headers: ["Status", "Bedeutung", "Nächste Schritte", "Wer kann setzen"],
            rows: [
              ["NEU", "Ticket angelegt", "→ EINGEGANGEN", "System (auto)"],
              ["EINGEGANGEN", "Annahme abgeschlossen", "→ IN_DIAGNOSE", "Theke, Admin"],
              ["IN_DIAGNOSE", "Techniker prüft Gerät", "→ WARTET_AUF_FREIGABE oder IN_REPARATUR", "Techniker"],
              ["WARTET_AUF_FREIGABE", "KVA erstellt", "→ FREIGEGEBEN oder STORNIERT", "System, Kunde"],
              ["FREIGEGEBEN", "Kunde hat zugestimmt", "→ IN_REPARATUR", "System (auto bei KVA-Genehmigung)"],
              ["IN_REPARATUR", "Reparatur läuft", "→ FERTIG", "Techniker"],
              ["FERTIG", "Abholbereit", "→ ABGESCHLOSSEN", "Theke"],
              ["ABGESCHLOSSEN", "Vorgang beendet", "- (Terminal)", "Theke, Admin"],
              ["STORNIERT", "Abgebrochen", "- (Terminal)", "Admin, Kunde"]
            ]
          }
        ]
      },
      {
        id: "status-transitions",
        title: "4.2 Status-Übergänge",
        content: `Regeln für Statuswechsel:

VORWÄRTS (normal):
• Jeder Status kann zum nächsten logischen Status wechseln
• Bestimmte Übergänge erfordern Bedingungen (z.B. KVA-Genehmigung)

RÜCKWÄRTS (Ausnahme):
• Nur mit Begründung möglich
• Wird in status_history protokolliert
• ABGESCHLOSSEN kann nicht rückgängig gemacht werden

AUTOMATISCHE ÜBERGÄNGE:
• NEU → EINGEGANGEN: Bei Signatur auf Eingangsbeleg
• WARTET_AUF_FREIGABE → FREIGEGEBEN: Bei KVA-Genehmigung
• FREIGEGEBEN → IN_REPARATUR: Optional automatisch`
      },
      {
        id: "status-history",
        title: "4.3 Status-Historie",
        content: `Alle Statusänderungen werden protokolliert:`,
        code: [
          {
            language: "sql",
            title: "status_history Tabelle",
            code: `CREATE TABLE public.status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_ticket_id UUID NOT NULL REFERENCES repair_tickets(id),
  
  old_status ticket_status,
  new_status ticket_status NOT NULL,
  
  changed_by_user_id UUID REFERENCES profiles(id),
  note TEXT,                     -- Pflicht bei Rückwärts-Änderung
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger für automatische Protokollierung
CREATE TRIGGER log_status_change
  AFTER UPDATE OF status ON repair_tickets
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_ticket_status_change();`
          }
        ]
      }
    ]
  },
  {
    id: "kva-module",
    number: "5",
    title: "KVA-Modul",
    sections: [
      {
        id: "kva-overview",
        title: "5.1 KVA-Übersicht",
        content: `Der Kostenvoranschlag (KVA) ist zentral für die Preisgestaltung und Kundenfreigabe.

WANN WIRD EIN KVA BENÖTIGT?
• price_mode = 'KVA_REQUIRED' (manuell gesetzt)
• Reparaturkosten überschreiten Grenzwert
• B2B-Partner verlangt immer KVA
• Unbekannter Schaden bei Annahme

KVA-TYPEN:
• STANDARD: Normaler Kostenvoranschlag
• NACHKALKULATION: Kosten haben sich geändert
• ENTSORGUNG: Gerät wird nicht repariert`
      },
      {
        id: "kva-pricing",
        title: "5.2 Preisstruktur",
        content: `Die KVA enthält mehrere Preisebenen:`,
        tables: [
          {
            headers: ["Feld", "Bedeutung", "Sichtbar für"],
            rows: [
              ["repair_cost", "Arbeitskosten (Diagnose, Reparatur)", "Intern"],
              ["parts_cost", "Teilekosten (EK)", "Intern"],
              ["total_cost", "Gesamtkosten intern", "Intern, B2B"],
              ["internal_price", "EK für B2B-Partner", "Intern, B2B-Partner"],
              ["endcustomer_price", "VK für Endkunde", "Alle"],
              ["kva_fee_amount", "KVA-Gebühr bei Ablehnung", "Alle"]
            ]
          }
        ],
        code: [
          {
            language: "typescript",
            title: "Preis-Sichtbarkeitslogik",
            code: `// Im Frontend
const getPriceForUser = (kva: KvaEstimate, userRole: string) => {
  if (['ADMIN', 'FILIALLEITER', 'TECHNIKER'].includes(userRole)) {
    // Interne sehen alles
    return {
      repair: kva.repair_cost,
      parts: kva.parts_cost,
      total: kva.total_cost,
      internal: kva.internal_price
    };
  }
  
  if (userRole.startsWith('B2B_')) {
    // B2B sieht internal_price (EK) und endcustomer_price
    return {
      internal: kva.internal_price,
      endcustomer: kva.endcustomer_price
    };
  }
  
  // Endkunde sieht nur Endpreis
  return { total: kva.endcustomer_price };
};`
          }
        ]
      },
      {
        id: "kva-workflow",
        title: "5.3 KVA-Workflow",
        content: `Der KVA-Freigabe-Prozess:

1. ERSTELLEN
   • Techniker erstellt KVA nach Diagnose
   • Setzt Kosten und Beschreibung
   • Status: OFFEN

2. VERSENDEN
   • An Kunden via SMS/E-Mail
   • Enthält Link zum Tracking-Portal
   • Status: GESENDET

3. ENTSCHEIDUNG
   • Kunde genehmigt → GENEHMIGT
   • Kunde lehnt ab → ABGELEHNT
   • Kunde antwortet nicht → EXPIRED

4. FOLGEAKTIONEN
   • GENEHMIGT: Ticket → FREIGEGEBEN → IN_REPARATUR
   • ABGELEHNT: KVA-Gebühr fällig, Ticket → STORNIERT oder ENTSORGUNG
   • EXPIRED: Reminder senden oder eskalieren`
      },
      {
        id: "kva-decisions",
        title: "5.4 KVA-Entscheidungen",
        content: `Mögliche Entscheidungen bei KVA:`,
        code: [
          {
            language: "sql",
            title: "kva_status ENUM",
            code: `CREATE TYPE kva_status AS ENUM (
  'OFFEN',              -- Noch nicht gesendet
  'GESENDET',           -- An Kunden versendet
  'GENEHMIGT',          -- Kunde hat zugestimmt
  'ABGELEHNT',          -- Kunde hat abgelehnt
  'EXPIRED',            -- Keine Antwort (Frist abgelaufen)
  'KULANZ',             -- Reparatur auf Kulanz
  'ENTSORGUNG',         -- Gerät wird entsorgt
  'RUECKNAHME_OHNE_REP' -- Rücknahme ohne Reparatur
);`
          }
        ]
      }
    ]
  },
  {
    id: "b2b-functions",
    number: "6",
    title: "B2B-Funktionen",
    sections: [
      {
        id: "b2b-portal",
        title: "6.1 B2B-Portal Struktur",
        content: `Das B2B-Portal ist eine eigenständige Anwendung innerhalb des Systems unter /b2b/*.

HAUPTBEREICHE:
• Dashboard: Übersicht offene Aufträge, KVAs
• Aufträge: Liste, Neuanlage, Detailansicht
• Sendungen: Versand-Management
• Kunden: Endkunden-Verwaltung
• Einstellungen: Firmendaten, Branding

ISOLATION:
• Eigenes Layout (B2BLayout)
• Eigene Navigation
• Nur eigene Daten sichtbar (via RLS)
• Kein Zugriff auf interne Bereiche`
      },
      {
        id: "b2b-order-creation",
        title: "6.2 Auftragsanlage",
        content: `B2B-Partner können Aufträge anlegen:

PFLICHTFELDER:
• Gerät: Marke, Modell, Gerätetyp
• Fehlerbeschreibung: error_code oder Freitext
• Optional: Endkunden-Daten

GERÄTE-AUSWAHL:
• Gleicher Katalog wie intern (device_catalog)
• Sortierung: Apple nach Generation (neu→alt), andere alphabetisch
• "Modell fehlt?" → Antrag an Admin

UNTERSCHIEDE ZU INTERN:
• Kein Zugriff auf Ersatzteile
• Keine Preisgestaltung
• Keine Techniker-Zuweisung`
      },
      {
        id: "b2b-model-request",
        title: "6.3 Modell-Anfrage",
        content: `Wenn ein Modell fehlt:`,
        code: [
          {
            language: "sql",
            title: "model_requests Tabelle",
            code: `CREATE TABLE public.model_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Antrag
  device_type TEXT NOT NULL,
  brand TEXT NOT NULL,
  model_name TEXT NOT NULL,
  
  -- Herkunft
  requested_by UUID REFERENCES profiles(id),
  b2b_partner_id UUID REFERENCES b2b_partners(id),
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'rejected')
  ),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);`
          }
        ]
      },
      {
        id: "b2b-restrictions",
        title: "6.4 B2B-Einschränkungen",
        content: `Was B2B-Partner NICHT können:

VERBOTEN:
• Gerätekatalog bearbeiten
• Preislisten einsehen/ändern
• Interne Notizen sehen
• Andere Partner-Daten sehen
• Werkstatt-Bereich betreten
• Techniker zuweisen
• Benutzer außerhalb des Partners verwalten
• System-Einstellungen ändern

SICHTBARKEITS-GRENZEN:
• Nur eigene Tickets (b2b_partner_id = Partner)
• Nur eigene Kunden (b2b_customers)
• Nur eigene Sendungen
• internal_price nur wenn freigegeben`
      }
    ]
  },
  {
    id: "communication",
    number: "7",
    title: "Kommunikation & Nachrichten",
    sections: [
      {
        id: "message-types",
        title: "7.1 Nachrichten-Typen",
        content: `Das System unterscheidet drei Nachrichtentypen:`,
        tables: [
          {
            headers: ["Typ", "Erstellt von", "Sichtbar für", "Anwendung"],
            rows: [
              ["internal_note", "Interne Mitarbeiter", "Nur intern", "Techniker-Notizen, interne Kommunikation"],
              ["b2b_message", "Intern oder B2B", "Intern + B2B-Partner", "Kommunikation mit B2B"],
              ["customer_message", "Alle", "Alle inkl. Tracking", "Kundenkommunikation"]
            ]
          }
        ],
        code: [
          {
            language: "sql",
            title: "RLS für Nachrichten",
            code: `-- B2B-Partner sehen nur b2b_message und customer_message
CREATE POLICY "b2b_can_view_messages"
ON ticket_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM repair_tickets rt
    WHERE rt.id = ticket_messages.repair_ticket_id
    AND rt.b2b_partner_id = get_user_b2b_partner_id()
  )
  AND message_type IN ('b2b_message', 'customer_message')
);`
          }
        ]
      },
      {
        id: "notifications",
        title: "7.2 Benachrichtigungen",
        content: `Automatische Benachrichtigungen:`,
        code: [
          {
            language: "sql",
            title: "notification_trigger ENUM",
            code: `CREATE TYPE notification_trigger AS ENUM (
  'TICKET_CREATED',          -- Auftrag erstellt
  'STATUS_CHANGED',          -- Status geändert
  'KVA_SENT',                -- KVA versendet
  'KVA_APPROVED',            -- KVA genehmigt
  'KVA_REJECTED',            -- KVA abgelehnt
  'KVA_REMINDER',            -- KVA Erinnerung
  'TICKET_READY',            -- Fertig zur Abholung
  'MESSAGE_RECEIVED',        -- Neue Nachricht
  'B2B_ORDER_RECEIVED'       -- B2B Auftrag eingegangen
);`
          }
        ]
      },
      {
        id: "photo-visibility",
        title: "7.3 Foto-Sichtbarkeit",
        content: `Ticket-Fotos haben ebenfalls Sichtbarkeitsstufen:`,
        tables: [
          {
            headers: ["Kategorie", "Beispiele", "B2B sichtbar", "Kunde sichtbar"],
            rows: [
              ["intake", "Zustandsfotos bei Annahme", "✓", "✓"],
              ["diagnosis", "Diagnose-Fotos", "✓", "Auf Anfrage"],
              ["repair", "Reparatur-Dokumentation", "✓", "✗"],
              ["internal", "Interne Dokumentation", "✗", "✗"]
            ]
          }
        ]
      }
    ]
  },
  {
    id: "documents",
    number: "8",
    title: "Dokumente & Belege",
    sections: [
      {
        id: "document-types",
        title: "8.1 Dokumententypen",
        content: `Das System erstellt verschiedene Dokumente:`,
        tables: [
          {
            headers: ["Dokument", "Format", "Wann erstellt", "Inhalt"],
            rows: [
              ["Eingangsbeleg", "A4 PDF", "Bei Annahme", "Kundendaten, Gerät, Zustand, AGB"],
              ["Abholschein (Bon)", "80mm Thermo", "Bei Annahme", "Ticket-Nr, Tracking-Code, QR"],
              ["KVA-Schreiben", "A4 PDF", "Bei KVA-Versand", "Diagnose, Kosten, Optionen"],
              ["Reparaturbericht", "A4 PDF", "Bei Fertigstellung", "Durchgeführte Arbeiten, Teile"],
              ["Lieferschein", "A4 PDF", "Bei Versand (B2B)", "Geräteliste, Empfänger"]
            ]
          }
        ]
      },
      {
        id: "whitelabel",
        title: "8.2 Whitelabel-Dokumente",
        content: `B2B-Partner erhalten gebrandete Dokumente:

ANPASSBAR PRO PARTNER:
• Logo (company_logo_url)
• Primärfarbe (primary_color)
• Firmenname und Kontakt
• Fußzeilen-Text (legal_footer)
• AGB und Datenschutz-Texte (document_texts)

ABLAUF:
1. System prüft bei Dokumenterstellung ob is_b2b = true
2. Lädt Partner-Branding aus b2b_partners
3. Ersetzt Standard-Logo und Texte
4. Generiert PDF mit Partner-Design`,
        code: [
          {
            language: "typescript",
            title: "Whitelabel-Rendering",
            code: `const getDocumentBranding = async (ticket: RepairTicket) => {
  if (!ticket.is_b2b || !ticket.b2b_partner_id) {
    return DEFAULT_BRANDING; // Telya Standard
  }
  
  const partner = await supabase
    .from('b2b_partners')
    .select('company_logo_url, primary_color, legal_footer, document_texts')
    .eq('id', ticket.b2b_partner_id)
    .single();
  
  return {
    logo: partner.company_logo_url || DEFAULT_BRANDING.logo,
    primaryColor: partner.primary_color || DEFAULT_BRANDING.primaryColor,
    footer: partner.legal_footer || DEFAULT_BRANDING.footer,
    texts: partner.document_texts || {}
  };
};`
          }
        ]
      },
      {
        id: "document-templates",
        title: "8.3 Vorlagen-Verwaltung",
        content: `Editierbare Textbausteine werden in document_templates gespeichert:`,
        code: [
          {
            language: "sql",
            title: "document_templates Tabelle",
            code: `CREATE TABLE public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,        -- EINGANGSBELEG, KVA, etc.
  locale TEXT DEFAULT 'de',
  
  title TEXT NOT NULL,
  intro TEXT,                -- Einleitungstext
  conditions TEXT,           -- AGB / Bedingungen
  footer TEXT,               -- Fußzeile
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- B2B-Partner haben eigene Vorlagen
CREATE TABLE public.b2b_document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  b2b_partner_id UUID NOT NULL REFERENCES b2b_partners(id),
  template_type TEXT NOT NULL,
  
  title TEXT,
  intro TEXT,
  conditions TEXT,
  legal_text TEXT,
  footer TEXT,
  
  is_active BOOLEAN DEFAULT true
);`
          }
        ]
      }
    ]
  },
  {
    id: "shipping",
    number: "9",
    title: "Versand & Logistik",
    sections: [
      {
        id: "shipment-types",
        title: "9.1 Sendungstypen",
        content: `Das System unterstützt verschiedene Versandszenarien:`,
        tables: [
          {
            headers: ["Typ", "Richtung", "Anwendung"],
            rows: [
              ["EINGANG", "B2B → Telya", "B2B sendet Geräte zur Reparatur"],
              ["RUECKVERSAND_B2B", "Telya → B2B", "Reparierte Geräte zurück an Partner"],
              ["RUECKVERSAND_ENDKUNDE", "Telya → Endkunde", "Direkt an Endkunden des Partners"]
            ]
          }
        ]
      },
      {
        id: "shipment-schema",
        title: "9.2 Sendungs-Datenmodell",
        content: `Sendungen werden in b2b_shipments verwaltet:`,
        code: [
          {
            language: "sql",
            title: "b2b_shipments Struktur",
            code: `CREATE TABLE public.b2b_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_number TEXT NOT NULL UNIQUE,
  b2b_partner_id UUID NOT NULL REFERENCES b2b_partners(id),
  
  -- Typ und Status
  shipment_type TEXT NOT NULL,  -- 'incoming', 'outgoing_b2b', 'outgoing_customer'
  status b2b_shipment_status DEFAULT 'ERSTELLT',
  
  -- Adressen (JSONB für Flexibilität)
  sender_address JSONB,         -- Absender (bei B2B automatisch aus Partner)
  recipient_address JSONB,      -- Empfänger
  endcustomer_address JSONB,    -- Für Direktversand an Endkunde
  
  -- Tracking
  dhl_tracking_number TEXT,
  dhl_label_url TEXT,
  
  -- Optionen
  return_to_endcustomer BOOLEAN DEFAULT false,
  notes TEXT,
  
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sendungsstatus
CREATE TYPE b2b_shipment_status AS ENUM (
  'ERSTELLT',
  'LABEL_ERSTELLT',
  'VERSENDET',
  'IN_ZUSTELLUNG',
  'ZUGESTELLT',
  'PROBLEM'
);`
          }
        ]
      },
      {
        id: "shipment-workflow",
        title: "9.3 Versand-Workflow",
        content: `Typischer Ablauf einer B2B-Sendung:

EINGANG (B2B → Telya):
1. B2B erstellt Sendung, wählt Tickets
2. Absender automatisch = Partner-Adresse
3. Empfänger = Telya Werkstatt
4. Optional: DHL-Label erstellen
5. B2B versendet, Status → VERSENDET
6. Telya bestätigt Eingang

RÜCKVERSAND (Telya → B2B/Endkunde):
1. Tickets auf FERTIG
2. Sendung erstellen, Tickets zuordnen
3. Ziel: B2B-Partner ODER Endkunde (wählbar)
4. Label erstellen, versenden
5. Tracking bis Zustellung`
      }
    ]
  },
  {
    id: "security",
    number: "10",
    title: "Sicherheit & RLS",
    sections: [
      {
        id: "rls-principles",
        title: "10.1 RLS-Grundprinzipien",
        content: `Row Level Security (RLS) schützt alle Tabellen:

AKTIVIERUNG:
• ALTER TABLE ... ENABLE ROW LEVEL SECURITY;
• Ohne Policies: Kein Zugriff (deny by default)

POLICY-TYPEN:
• FOR SELECT: Lesezugriff
• FOR INSERT: Neuanlage
• FOR UPDATE: Änderung
• FOR DELETE: Löschung

HILFSFUNKTIONEN:
• auth.uid() → Aktuelle User-ID
• has_role(role) → Rollenprüfung
• get_user_b2b_partner_id() → Partner-ID`
      },
      {
        id: "rls-patterns",
        title: "10.2 Typische RLS-Muster",
        content: `Wiederkehrende RLS-Patterns:`,
        code: [
          {
            language: "sql",
            title: "Standard RLS-Patterns",
            code: `-- Pattern 1: Mandantentrennung (B2B)
CREATE POLICY "b2b_isolation" ON repair_tickets
FOR ALL USING (
  -- Interne sehen alles
  NOT is_b2b_user()
  OR
  -- B2B sieht nur eigene
  b2b_partner_id = get_user_b2b_partner_id()
);

-- Pattern 2: Standort-Beschränkung
CREATE POLICY "location_filter" ON repair_tickets
FOR SELECT USING (
  has_role('ADMIN')
  OR
  location_id IN (
    SELECT location_id FROM profiles WHERE id = auth.uid()
  )
);

-- Pattern 3: Techniker sieht zugewiesene
CREATE POLICY "technician_assigned" ON repair_tickets
FOR SELECT USING (
  assigned_technician_id = auth.uid()
  OR has_role('ADMIN')
);`
          }
        ]
      },
      {
        id: "rls-errors",
        title: "10.3 Häufige RLS-Fehler",
        content: `Typische Fehlermeldungen und Lösungen:`,
        tables: [
          {
            headers: ["Fehler", "Ursache", "Lösung"],
            rows: [
              ["new row violates row-level security policy", "INSERT ohne passende Policy", "WITH CHECK Bedingung prüfen"],
              ["permission denied for table", "RLS aktiv, keine Policy", "SELECT Policy hinzufügen"],
              ["infinite recursion in policy", "Policy referenziert sich selbst", "SECURITY DEFINER Funktion nutzen"],
              ["Keine Daten angezeigt", "USING Bedingung zu restriktiv", "Policy-Logik erweitern"]
            ]
          }
        ]
      },
      {
        id: "security-best-practices",
        title: "10.4 Best Practices",
        content: `Sicherheits-Empfehlungen:

AUTHENTIFIZIERUNG:
• Keine anonymen Signups
• E-Mail-Bestätigung aktivieren
• Session-Timeout implementieren

AUTORISIERUNG:
• RLS auf ALLEN Tabellen
• Principle of Least Privilege
• Separate Policies pro Operation

DATENSCHUTZ:
• Passcodes verschlüsselt speichern
• Keine sensiblen Daten in Logs
• DSGVO-konforme Datenhandhabung

EDGE FUNCTIONS:
• Secrets in Environment Variables
• Input-Validierung
• Rate Limiting auf öffentlichen Endpoints`
      }
    ]
  },
  {
    id: "architecture-recommendations",
    number: "11",
    title: "Architektur-Empfehlungen",
    sections: [
      {
        id: "keep-as-is",
        title: "11.1 Bewährte Komponenten",
        content: `Diese Konzepte sollten übernommen werden:

✓ RLS-BASIERTE MANDANTENTRENNUNG
  • Saubere Isolation ohne Anwendungslogik
  • Zentrale Hilfsfunktionen (has_role, get_user_b2b_partner_id)

✓ STATUS-WORKFLOW MIT ENUM
  • Typsichere Status-Definitionen
  • Automatische Historie-Protokollierung

✓ KVA-VERSIONIERUNG
  • Nachvollziehbare Preisänderungen
  • is_current Flag für aktuelle Version

✓ MESSAGE-TYPE BASIERTE KOMMUNIKATION
  • Klare Sichtbarkeitsregeln
  • Einfache RLS-Integration

✓ PERMISSION-SYSTEM
  • Granulare Berechtigungen
  • Rollenbasierte Zuordnung`
      },
      {
        id: "improvements",
        title: "11.2 Verbesserungsvorschläge",
        content: `Bei Neubau anders lösen:

DOKUMENTE:
• Aktuell: On-the-fly HTML→PDF Generierung
• Besser: Serverseitige PDF-Generierung mit Storage
• Vorteil: Konsistenz, Archivierung, weniger Client-Last

PREISFELDER:
• Aktuell: Dupliziert in repair_tickets UND kva_estimates
• Besser: Nur in kva_estimates, Ticket referenziert
• Vorteil: Single Source of Truth

BENUTZER-PROFILE:
• Aktuell: Manuelle Sync zwischen auth.users und profiles
• Besser: DB-Trigger für automatische Synchronisation
• Vorteil: Konsistenz garantiert

WHITELABEL:
• Aktuell: Partner-Branding in b2b_partners Spalten
• Besser: Separate branding Tabelle mit Themes
• Vorteil: Erweiterbarkeit, Theming-Vorlagen`
      },
      {
        id: "module-separation",
        title: "11.3 Modul-Trennung",
        content: `Empfohlene Modul-Struktur:

CORE MODULE:
• tickets (Status, Historie)
• customers (Stammdaten)
• devices (Gerätekatalog)

PRICING MODULE:
• kva (Kostenvoranschläge)
• price_list (Preiskatalog)

B2B MODULE:
• partners (Mandanten)
• b2b_customers (Endkunden)
• shipments (Versand)
• whitelabel (Branding)

INVENTORY MODULE:
• parts (Ersatzteile)
• stock_movements (Lagerbewegungen)
• suppliers (Lieferanten)

COMMUNICATION MODULE:
• messages (Nachrichten)
• notifications (Benachrichtigungen)
• templates (Vorlagen)`
      },
      {
        id: "lessons-learned",
        title: "11.4 Lessons Learned",
        content: `Fehler aus aktuellem System vermeiden:

1. FRÜHZEITIGE TYPENSICHERHEIT
   • ENUMs von Anfang an definieren
   • TypeScript-Types aus DB generieren

2. KONSISTENTE NAMENSKONVENTIONEN
   • snake_case für DB
   • camelCase für Frontend
   • Klare Präfixe (b2b_, ticket_, kva_)

3. RLS ZUERST
   • Policies vor Anwendungscode
   • Testen mit verschiedenen Rollen

4. DOKUMENTATION PARALLEL
   • Schema-Änderungen dokumentieren
   • Workflow-Diagramme aktuell halten

5. TESTDATEN-STRATEGIE
   • Seed-Skripte für alle Mandanten
   • Realistische B2B-Szenarien`
      }
    ]
  }
];

// Appendix: ENUM Reference
export const ENUM_REFERENCE = {
  ticket_status: [
    "NEU", "EINGEGANGEN", "IN_DIAGNOSE", "WARTET_AUF_FREIGABE",
    "FREIGEGEBEN", "IN_REPARATUR", "QUALITAETSKONTROLLE", "FERTIG",
    "ABGESCHLOSSEN", "STORNIERT", "ENTSORGUNG"
  ],
  kva_status: [
    "OFFEN", "GESENDET", "GENEHMIGT", "ABGELEHNT", "EXPIRED",
    "KULANZ", "ENTSORGUNG", "RUECKNAHME_OHNE_REP"
  ],
  app_role: [
    "ADMIN", "FILIALLEITER", "TECHNIKER", "THEKE", "BUCHHALTUNG",
    "B2B_INHABER", "B2B_ADMIN", "B2B_USER"
  ],
  device_type: [
    "SMARTPHONE", "TABLET", "LAPTOP", "SMARTWATCH", "KONSOLE", "SONSTIGES"
  ],
  price_mode: ["STANDARD", "FESTPREIS", "KVA_REQUIRED"],
  notification_channel: ["SMS", "EMAIL", "PUSH", "IN_APP"],
  b2b_shipment_status: [
    "ERSTELLT", "LABEL_ERSTELLT", "VERSENDET", "IN_ZUSTELLUNG", "ZUGESTELLT", "PROBLEM"
  ]
};
