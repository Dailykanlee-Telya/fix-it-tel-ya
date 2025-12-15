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
  { key: 'auftragsnummer', label: '{{auftragsnummer}}', description: 'Auftragsnummer (z.B. TE-GE-25-0100)' },
  { key: 'kunde_name', label: '{{kunde_name}}', description: 'Vollständiger Kundenname' },
  { key: 'kunde_vorname', label: '{{kunde_vorname}}', description: 'Vorname des Kunden' },
  { key: 'kunde_nachname', label: '{{kunde_nachname}}', description: 'Nachname des Kunden' },
  { key: 'kunde_firma', label: '{{kunde_firma}}', description: 'Firmenname (falls vorhanden)' },
  { key: 'kunde_email', label: '{{kunde_email}}', description: 'E-Mail des Kunden' },
  { key: 'kunde_telefon', label: '{{kunde_telefon}}', description: 'Telefonnummer des Kunden' },
  { key: 'kunde_adresse', label: '{{kunde_adresse}}', description: 'Adresse des Kunden' },
  { key: 'filiale_name', label: '{{filiale_name}}', description: 'Name der Filiale' },
  { key: 'filiale_adresse', label: '{{filiale_adresse}}', description: 'Adresse der Filiale' },
  { key: 'filiale_telefon', label: '{{filiale_telefon}}', description: 'Telefon der Filiale' },
  { key: 'datum', label: '{{datum}}', description: 'Aktuelles Datum (TT.MM.JJJJ)' },
  { key: 'datum_uhrzeit', label: '{{datum_uhrzeit}}', description: 'Datum und Uhrzeit' },
  { key: 'erstelldatum', label: '{{erstelldatum}}', description: 'Erstellungsdatum des Auftrags' },
  { key: 'geraet_hersteller', label: '{{geraet_hersteller}}', description: 'Hersteller des Geräts' },
  { key: 'geraet_modell', label: '{{geraet_modell}}', description: 'Modell des Geräts' },
  { key: 'geraet_typ', label: '{{geraet_typ}}', description: 'Gerätetyp (Handy, Tablet, etc.)' },
  { key: 'imei', label: '{{imei}}', description: 'IMEI-Nummer' },
  { key: 'seriennummer', label: '{{seriennummer}}', description: 'Seriennummer' },
  { key: 'fehlerbeschreibung', label: '{{fehlerbeschreibung}}', description: 'Fehlerbeschreibung' },
  { key: 'zubehoer', label: '{{zubehoer}}', description: 'Mitgegebenes Zubehör' },
  { key: 'kva_betrag_brutto', label: '{{kva_betrag_brutto}}', description: 'KVA Betrag inkl. MwSt.' },
  { key: 'kva_gebuehr_brutto', label: '{{kva_gebuehr_brutto}}', description: 'KVA-Gebühr (bei Ablehnung)' },
  { key: 'endbetrag_brutto', label: '{{endbetrag_brutto}}', description: 'Gesamtbetrag inkl. MwSt.' },
  { key: 'teile_betrag', label: '{{teile_betrag}}', description: 'Ersatzteilkosten' },
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
  
  return {
    auftragsnummer: ticket?.ticket_number || '',
    kunde_name: `${ticket?.customer?.first_name || ''} ${ticket?.customer?.last_name || ''}`.trim(),
    kunde_vorname: ticket?.customer?.first_name || '',
    kunde_nachname: ticket?.customer?.last_name || '',
    kunde_firma: '', // Not available in current schema
    kunde_email: ticket?.customer?.email || '',
    kunde_telefon: ticket?.customer?.phone || '',
    kunde_adresse: ticket?.customer?.address || '',
    filiale_name: ticket?.location?.name || '',
    filiale_adresse: ticket?.location?.address || '',
    filiale_telefon: ticket?.location?.phone || '',
    datum: format(new Date(), 'dd.MM.yyyy', { locale: de }),
    datum_uhrzeit: format(new Date(), 'dd.MM.yyyy HH:mm', { locale: de }),
    erstelldatum: ticket?.created_at 
      ? format(new Date(ticket.created_at), 'dd.MM.yyyy HH:mm', { locale: de })
      : '',
    geraet_hersteller: ticket?.device?.brand || '',
    geraet_modell: ticket?.device?.model || '',
    geraet_typ: ticket?.device?.device_type || '',
    imei: ticket?.device?.imei_or_serial || '',
    seriennummer: ticket?.device?.serial_number || ticket?.device?.imei_or_serial || '',
    fehlerbeschreibung: ticket?.error_description_text || '',
    zubehoer: ticket?.accessories || 'Kein Zubehör',
    kva_betrag_brutto: `${(ticket?.estimated_price || 0).toFixed(2)} €`,
    kva_gebuehr_brutto: ticket?.kva_fee_amount ? `${ticket.kva_fee_amount.toFixed(2)} €` : '0,00 €',
    endbetrag_brutto: `${totalPrice.toFixed(2)} €`,
    teile_betrag: `${totalPartsPrice.toFixed(2)} €`,
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
