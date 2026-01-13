import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { TELYA_ADDRESS } from '@/types/b2b';

export interface PlaceholderData {
  ticket: any;
  partUsage?: any[];
}

export interface PlaceholderDefinition {
  key: string;
  label: string;
  description: string;
}

export const AVAILABLE_PLACEHOLDERS: PlaceholderDefinition[] = [
  // Auftrag
  { key: 'auftragsnummer', label: '{{auftragsnummer}}', description: 'Auftragsnummer (z.B. TEBO250100)' },
  { key: 'datum', label: '{{datum}}', description: 'Aktuelles Datum (TT.MM.JJJJ)' },
  { key: 'datum_uhrzeit', label: '{{datum_uhrzeit}}', description: 'Datum und Uhrzeit' },
  { key: 'erstelldatum', label: '{{erstelldatum}}', description: 'Erstellungsdatum des Auftrags' },
  { key: 'abschluss_datum', label: '{{abschluss_datum}}', description: 'Abschlussdatum der Reparatur' },
  
  // Kunde
  { key: 'kunde_name', label: '{{kunde_name}}', description: 'Vollständiger Kundenname' },
  { key: 'kunde_vorname', label: '{{kunde_vorname}}', description: 'Vorname des Kunden' },
  { key: 'kunde_nachname', label: '{{kunde_nachname}}', description: 'Nachname des Kunden' },
  { key: 'kunde_firma', label: '{{kunde_firma}}', description: 'Firmenname (falls vorhanden)' },
  { key: 'kunde_email', label: '{{kunde_email}}', description: 'E-Mail des Kunden' },
  { key: 'kunde_telefon', label: '{{kunde_telefon}}', description: 'Telefonnummer des Kunden' },
  { key: 'kunde_adresse', label: '{{kunde_adresse}}', description: 'Adresse des Kunden' },
  
  // Filiale
  { key: 'filiale_name', label: '{{filiale_name}}', description: 'Name der Filiale' },
  { key: 'filiale_adresse', label: '{{filiale_adresse}}', description: 'Adresse der Filiale' },
  { key: 'filiale_telefon', label: '{{filiale_telefon}}', description: 'Telefon der Filiale' },
  
  // Gerät
  { key: 'geraet_hersteller', label: '{{geraet_hersteller}}', description: 'Hersteller des Geräts' },
  { key: 'geraet_modell', label: '{{geraet_modell}}', description: 'Modell des Geräts' },
  { key: 'geraet_typ', label: '{{geraet_typ}}', description: 'Gerätetyp (Handy, Tablet, etc.)' },
  { key: 'geraet_farbe', label: '{{geraet_farbe}}', description: 'Farbe des Geräts' },
  { key: 'imei', label: '{{imei}}', description: 'IMEI-Nummer' },
  { key: 'seriennummer', label: '{{seriennummer}}', description: 'Seriennummer' },
  { key: 'zubehoer', label: '{{zubehoer}}', description: 'Mitgegebenes Zubehör' },
  { key: 'zubehoer_liste', label: '{{zubehoer_liste}}', description: 'Liste des Zubehörs' },
  
  // Fehlerbeschreibung
  { key: 'fehlerbeschreibung', label: '{{fehlerbeschreibung}}', description: 'Fehlerbeschreibung' },
  { key: 'fehlerbeschreibung_kunde', label: '{{fehlerbeschreibung_kunde}}', description: 'Fehlerbeschreibung vom Kunden' },
  { key: 'zustand_beschreibung', label: '{{zustand_beschreibung}}', description: 'Zustandsbeschreibung des Geräts' },
  { key: 'interne_bemerkung', label: '{{interne_bemerkung}}', description: 'Interne Bemerkungen' },
  
  // Preise & KVA
  { key: 'kva_betrag_brutto', label: '{{kva_betrag_brutto}}', description: 'KVA Betrag inkl. MwSt.' },
  { key: 'kva_gebuehr_brutto', label: '{{kva_gebuehr_brutto}}', description: 'KVA-Gebühr (bei Ablehnung)' },
  { key: 'endbetrag_brutto', label: '{{endbetrag_brutto}}', description: 'Gesamtbetrag inkl. MwSt.' },
  { key: 'teile_betrag', label: '{{teile_betrag}}', description: 'Ersatzteilkosten' },
  { key: 'kva_gueltigkeit_tage', label: '{{kva_gueltigkeit_tage}}', description: 'KVA Gültigkeitsdauer in Tagen' },
  
  // Versand (Lieferschein)
  { key: 'lieferscheinnummer', label: '{{lieferscheinnummer}}', description: 'Lieferscheinnummer' },
  { key: 'versandart', label: '{{versandart}}', description: 'Versandart (z.B. DHL)' },
  { key: 'tracking_nummer', label: '{{tracking_nummer}}', description: 'Tracking-/Sendungsnummer' },
  
  // Firma
  { key: 'firma_name', label: '{{firma_name}}', description: 'Telya GmbH' },
  { key: 'firma_adresse', label: '{{firma_adresse}}', description: 'Firmenadresse' },
  { key: 'firma_telefon', label: '{{firma_telefon}}', description: 'Telefon der Firma' },
  { key: 'firma_email', label: '{{firma_email}}', description: 'E-Mail der Firma' },
];

export function buildPlaceholderMap(data: PlaceholderData): Record<string, string> {
  const { ticket, partUsage } = data;
  
  const totalPartsPrice = partUsage?.reduce(
    (sum: number, p: any) => sum + (p.unit_sales_price || 0) * p.quantity,
    0
  ) || 0;
  
  const totalPrice = (ticket?.estimated_price || ticket?.final_price || 0) + totalPartsPrice;
  
  // Format dates safely
  const now = new Date();
  const createdAt = ticket?.created_at ? new Date(ticket.created_at) : null;
  const updatedAt = ticket?.updated_at ? new Date(ticket.updated_at) : null;
  
  return {
    // Auftrag
    auftragsnummer: ticket?.ticket_number || '',
    datum: format(now, 'dd.MM.yyyy', { locale: de }),
    datum_uhrzeit: format(now, 'dd.MM.yyyy HH:mm', { locale: de }),
    erstelldatum: createdAt 
      ? format(createdAt, 'dd.MM.yyyy HH:mm', { locale: de })
      : '',
    abschluss_datum: updatedAt && ticket?.status === 'FERTIG_ZUR_ABHOLUNG'
      ? format(updatedAt, 'dd.MM.yyyy HH:mm', { locale: de })
      : format(now, 'dd.MM.yyyy', { locale: de }),
    
    // Kunde
    kunde_name: `${ticket?.customer?.first_name || ''} ${ticket?.customer?.last_name || ''}`.trim(),
    kunde_vorname: ticket?.customer?.first_name || '',
    kunde_nachname: ticket?.customer?.last_name || '',
    kunde_firma: '', // Not available in current schema
    kunde_email: ticket?.customer?.email || '',
    kunde_telefon: ticket?.customer?.phone || '',
    kunde_adresse: ticket?.customer?.address || '',
    
    // Filiale
    filiale_name: ticket?.location?.name || '',
    filiale_adresse: ticket?.location?.address || '',
    filiale_telefon: ticket?.location?.phone || '',
    
    // Gerät
    geraet_hersteller: ticket?.device?.brand || '',
    geraet_modell: ticket?.device?.model || '',
    geraet_typ: ticket?.device?.device_type || '',
    geraet_farbe: ticket?.device?.color || '',
    imei: ticket?.device?.imei_or_serial || '',
    seriennummer: ticket?.device?.serial_number || ticket?.device?.imei_or_serial || '',
    zubehoer: ticket?.accessories || 'Kein Zubehör',
    zubehoer_liste: ticket?.accessories || 'Kein Zubehör',
    
    // Fehlerbeschreibung
    fehlerbeschreibung: ticket?.error_description_text || '',
    fehlerbeschreibung_kunde: ticket?.error_description_text || '',
    zustand_beschreibung: '',
    interne_bemerkung: ticket?.internal_notes || '',
    
    // Preise & KVA
    kva_betrag_brutto: `${(ticket?.estimated_price || 0).toFixed(2)} €`,
    kva_gebuehr_brutto: ticket?.kva_fee_amount ? `${ticket.kva_fee_amount.toFixed(2)} €` : '19,90 €',
    kva_gebuehr_betrag: ticket?.kva_fee_amount ? `${ticket.kva_fee_amount.toFixed(2)} €` : '19,90 €', // Alias
    endbetrag_brutto: `${totalPrice.toFixed(2)} €`,
    teile_betrag: `${totalPartsPrice.toFixed(2)} €`,
    kva_gueltigkeit_tage: '14',
    uhrzeit: format(now, 'HH:mm', { locale: de }),
    
    // Versand (Lieferschein)
    lieferscheinnummer: ticket?.ticket_number || '',
    versandart: 'Standard',
    tracking_nummer: ticket?.shipment?.dhl_tracking_number || '',
    
    // Firma
    firma_name: TELYA_ADDRESS.name,
    firma_adresse: `${TELYA_ADDRESS.street}, ${TELYA_ADDRESS.zip} ${TELYA_ADDRESS.city}`,
    firma_telefon: TELYA_ADDRESS.phone,
    firma_email: TELYA_ADDRESS.email,
  };
}

export function replacePlaceholders(text: string, placeholderMap: Record<string, string>): string {
  if (!text) return '';
  
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return placeholderMap[key] !== undefined ? placeholderMap[key] : '';
  });
}

export interface DocumentTemplate {
  id: string;
  type: string;
  locale: string;
  title: string;
  intro: string | null;
  conditions: string | null;
  footer: string | null;
  created_at: string;
  updated_at: string;
}

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  'EINGANGSBELEG': 'Eingangsbeleg',
  'KVA': 'Kostenvoranschlag (KVA)',
  'REPARATURBERICHT': 'Reparaturbericht',
  'LIEFERSCHEIN': 'Lieferschein',
};

// Default fallback templates in case database templates are not found
export const DEFAULT_TEMPLATES: Record<string, Omit<DocumentTemplate, 'id' | 'created_at' | 'updated_at'>> = {
  'EINGANGSBELEG': {
    type: 'EINGANGSBELEG',
    locale: 'de',
    title: 'EINGANGSBESTÄTIGUNG / AUFTRAG',
    intro: 'Wir haben Ihr Gerät im Telya Repair Management System mit folgenden Daten aufgenommen:',
    conditions: '**Wichtige Hinweise**\n\n- Datensicherung: Für Datenverlust übernehmen wir keine Haftung.\n- KVA-Gebühr: Bei Nichtdurchführung der Reparatur kann eine Gebühr anfallen.',
    footer: 'Ich habe das oben genannte Gerät an Telya übergeben.',
  },
  'KVA': {
    type: 'KVA',
    locale: 'de',
    title: 'KOSTENVORANSCHLAG (KVA)',
    intro: 'Für den folgenden Auftrag haben wir eine Diagnose durchgeführt.',
    conditions: 'Bitte wählen Sie eine Option: 1. Reparatur durchführen 2. Gerät unrepariert zurück 3. Gerät kostenfrei entsorgen',
    footer: 'Mit Freigabe stimmen Sie der Durchführung der Reparatur zu.',
  },
  'REPARATURBERICHT': {
    type: 'REPARATURBERICHT',
    locale: 'de',
    title: 'REPARATURBERICHT / FERTIGMELDUNG',
    intro: 'Die Reparatur wurde abgeschlossen.',
    conditions: 'Auf verbaute Komponenten gewähren wir Garantie gemäß unseren Bedingungen.',
    footer: 'Mit Entgegennahme bestätigen Sie den Erhalt des reparierten Geräts.',
  },
  'LIEFERSCHEIN': {
    type: 'LIEFERSCHEIN',
    locale: 'de',
    title: 'LIEFERSCHEIN / RÜCKSENDUNG',
    intro: 'Mit diesem Lieferschein bestätigen wir die Rückgabe der aufgeführten Geräte.',
    conditions: 'Bitte prüfen Sie die Sendung auf Vollständigkeit.',
    footer: 'Empfang bestätigt: Ort, Datum, Unterschrift.',
  },
};
