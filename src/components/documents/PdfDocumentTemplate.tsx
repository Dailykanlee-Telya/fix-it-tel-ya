import React from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { TELYA_ADDRESS } from '@/types/b2b';
import { STATUS_LABELS, TicketStatus, DEVICE_TYPE_LABELS, DeviceType, ERROR_CODE_LABELS, ErrorCode } from '@/types/database';
import { DOCUMENT_LOGOS } from '@/lib/document-logo';

interface TicketData {
  ticket_number: string;
  created_at: string;
  updated_at: string;
  status: TicketStatus;
  error_code?: ErrorCode;
  error_description_text?: string;
  accessories?: string;
  price_mode: string;
  estimated_price?: number;
  final_price?: number;
  kva_approved?: boolean;
  kva_fee_amount?: number;
  kva_fee_applicable?: boolean;
  email_opt_in?: boolean;
  sms_opt_in?: boolean;
  passcode_info?: string;
  customer?: {
    first_name: string;
    last_name: string;
    phone: string;
    email?: string;
    address?: string;
  };
  device?: {
    brand: string;
    model: string;
    device_type: DeviceType;
    imei_or_serial?: string;
    serial_number?: string;
    color?: string;
    imei_unreadable?: boolean;
    serial_unreadable?: boolean;
  };
  location?: {
    name: string;
    address?: string;
    phone?: string;
  };
  assigned_technician?: {
    name: string;
  };
}

interface PartUsage {
  id: string;
  quantity: number;
  unit_sales_price?: number;
  part?: {
    name: string;
  };
}

// Company info from TELYA_ADDRESS
const COMPANY = {
  name: TELYA_ADDRESS.name,
  street: TELYA_ADDRESS.street,
  zip: TELYA_ADDRESS.zip,
  city: TELYA_ADDRESS.city,
  fullAddress: `${TELYA_ADDRESS.street}, ${TELYA_ADDRESS.zip} ${TELYA_ADDRESS.city}`,
  phone: TELYA_ADDRESS.phone,
  email: TELYA_ADDRESS.email,
  website: 'www.telya.de',
  hrb: TELYA_ADDRESS.hrb,
  vatId: TELYA_ADDRESS.vatId,
  managingDirector: TELYA_ADDRESS.managingDirector,
  iban: TELYA_ADDRESS.iban,
  bank: TELYA_ADDRESS.bank,
};

// Subheader tagline
const TAGLINE = 'Reparieren statt ersetzen · Nachhaltig & professionell';

// ============= REUSABLE COMPONENTS =============

export const PdfHeader = ({ 
  title, 
  ticketNumber, 
  date 
}: { 
  title: string; 
  ticketNumber: string; 
  date: string;
}) => (
  <div className="pdf-header">
    <div className="pdf-header-left">
      {/* Logo Integration - zentral verwaltet */}
      <div className="pdf-logo-container">
        <img 
          src={DOCUMENT_LOGOS.a4} 
          alt="Telya Logo" 
          className="pdf-logo"
          crossOrigin="anonymous"
        />
      </div>
      <div className="pdf-header-title">{title}</div>
      <div className="pdf-header-subtitle">{COMPANY.name} · {TAGLINE}</div>
    </div>
    <div className="pdf-header-right">
      <div className="pdf-order-number">{ticketNumber}</div>
      <div className="pdf-date">{date}</div>
    </div>
  </div>
);

export const PdfBox = ({ 
  title, 
  children,
  className = ''
}: { 
  title: string; 
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`pdf-box ${className}`}>
    <div className="pdf-box-header">{title}</div>
    {children}
  </div>
);

export const PdfDataRow = ({ 
  label, 
  value, 
  mono = false 
}: { 
  label: string; 
  value: React.ReactNode; 
  mono?: boolean;
}) => (
  <div className="pdf-data-row">
    <span className="pdf-data-label">{label}:</span>
    <span className={`pdf-data-value ${mono ? 'pdf-data-mono' : ''}`}>{value || '-'}</span>
  </div>
);

export const PdfSignatures = ({ showEmployee = true }: { showEmployee?: boolean }) => (
  <div className="pdf-signatures">
    <div className="pdf-signature-box">
      <div className="pdf-signature-line">Unterschrift Kunde</div>
      <div className="pdf-signature-sub">Ort, Datum</div>
    </div>
    {showEmployee && (
      <div className="pdf-signature-box">
        <div className="pdf-signature-line">Unterschrift Mitarbeiter</div>
        <div className="pdf-signature-sub">Telya GmbH</div>
      </div>
    )}
  </div>
);

export const PdfFooter = () => (
  <div className="pdf-footer">
    <div className="pdf-footer-company">{COMPANY.name}</div>
    <div className="pdf-footer-details">
      {COMPANY.fullAddress} · Tel: {COMPANY.phone} · {COMPANY.email}
      <br />
      {COMPANY.hrb} · USt-IdNr. {COMPANY.vatId} · Geschäftsführer: {COMPANY.managingDirector}
    </div>
    <div className="pdf-footer-website">{COMPANY.website}</div>
  </div>
);

export const PdfConditions = ({ title, text }: { title?: string; text: string }) => (
  <div className="pdf-conditions">
    <div className="pdf-conditions-title">{title || 'Wichtige Hinweise & Einverständnis'}</div>
    <div className="pdf-conditions-text">{text}</div>
  </div>
);

// Helper to get IMEI/Serial label based on device type
const getDeviceIdentifier = (device?: TicketData['device']) => {
  if (!device) return { label: 'IMEI/SN', value: '-', unreadable: false };
  
  const isPhone = device.device_type === 'HANDY';
  
  if (isPhone) {
    if (device.imei_unreadable) {
      return { label: 'IMEI', value: 'Nicht lesbar', unreadable: true };
    }
    return { label: 'IMEI', value: device.imei_or_serial || '-', unreadable: false };
  } else {
    if (device.serial_unreadable) {
      return { label: 'Seriennummer', value: 'Nicht lesbar', unreadable: true };
    }
    return { label: 'Seriennummer', value: device.serial_number || device.imei_or_serial || '-', unreadable: false };
  }
};

// ============= DOCUMENT: EINGANGSBELEG / REPARATURBEGLEITSCHEIN =============

export const IntakeDocument = ({ 
  ticket, 
  partUsage 
}: { 
  ticket: TicketData; 
  partUsage?: PartUsage[];
}) => {
  const createdDate = format(new Date(ticket.created_at), 'dd.MM.yyyy HH:mm', { locale: de });
  const deviceType = DEVICE_TYPE_LABELS[ticket.device?.device_type as DeviceType] || ticket.device?.device_type;
  const errorLabel = ERROR_CODE_LABELS[ticket.error_code as ErrorCode] || ticket.error_code || 'Sonstiges';
  const deviceId = getDeviceIdentifier(ticket.device);
  
  const priceModeLabel = ticket.price_mode === 'FIXPREIS' 
    ? 'Festpreis' 
    : ticket.price_mode === 'KVA' 
      ? 'Kostenvoranschlag (KVA)' 
      : 'Nach Aufwand';

  const conditions = `• Datensicherung: Für Datenverlust während der Reparatur übernehmen wir keine Haftung. Bitte sichern Sie Ihre Daten vorher.
• Kostenvoranschlag: Bei Nichtdurchführung der Reparatur fällt eine KVA-Gebühr von ${ticket.kva_fee_amount ? ticket.kva_fee_amount.toFixed(2) : '19,90'} € an.
• Reparaturdauer: Die voraussichtliche Reparaturdauer hängt von der Art des Defekts und der Verfügbarkeit von Ersatzteilen ab.
• Garantie: Auf verbaute Ersatzteile gewähren wir 6 Monate Garantie gemäß unseren AGB.
• Abholung: Nicht abgeholte Geräte werden nach 8 Wochen als Auftragsreparatur behandelt.
• Benachrichtigung: ${ticket.email_opt_in ? '✓ E-Mail' : '☐ E-Mail'} ${ticket.sms_opt_in ? '✓ SMS' : '☐ SMS'}`;

  return (
    <div className="pdf-document">
      <PdfHeader 
        title="REPARATURBEGLEITSCHEIN / EINGANGSBESTÄTIGUNG"
        ticketNumber={ticket.ticket_number}
        date={createdDate}
      />

      <div className="pdf-grid">
        {/* A) Kundendaten */}
        <PdfBox title="A) Kundendaten">
          <PdfDataRow label="Name" value={`${ticket.customer?.first_name} ${ticket.customer?.last_name}`} />
          {ticket.customer?.address && <PdfDataRow label="Adresse" value={ticket.customer.address} />}
          <PdfDataRow label="Telefon" value={ticket.customer?.phone} />
          {ticket.customer?.email && <PdfDataRow label="E-Mail" value={ticket.customer.email} />}
        </PdfBox>

        {/* B) Auftragsdaten */}
        <PdfBox title="B) Auftragsdaten">
          <PdfDataRow label="Datum/Uhrzeit" value={createdDate} />
          <PdfDataRow label="Filiale" value={ticket.location?.name || 'Hauptfiliale'} />
          {ticket.assigned_technician?.name && (
            <PdfDataRow label="Mitarbeiter" value={ticket.assigned_technician.name} />
          )}
          <PdfDataRow label="Status" value={STATUS_LABELS[ticket.status]} />
        </PdfBox>

        {/* C) Gerätedaten */}
        <PdfBox title="C) Gerätedaten">
          <PdfDataRow label="Gerätetyp" value={deviceType} />
          <PdfDataRow label="Hersteller" value={ticket.device?.brand} />
          <PdfDataRow label="Modell" value={ticket.device?.model} />
          <PdfDataRow label={deviceId.label} value={deviceId.value} mono={!deviceId.unreadable} />
          {ticket.device?.color && <PdfDataRow label="Farbe" value={ticket.device.color} />}
        </PdfBox>

        {/* D) Zubehör */}
        <PdfBox title="D) Zubehör bei Abgabe">
          <div className="pdf-text-block">
            {ticket.accessories || 'Kein Zubehör abgegeben'}
          </div>
        </PdfBox>

        {/* E) Fehlerbeschreibung - Full width */}
        <PdfBox title="E) Fehlerbeschreibung & Zustand bei Annahme" className="pdf-grid-full">
          <PdfDataRow label="Fehlertyp" value={errorLabel} />
          <div className="pdf-text-block" style={{ marginTop: '2mm' }}>
            {ticket.error_description_text || 'Keine detaillierte Beschreibung angegeben'}
          </div>
        </PdfBox>

        {/* F) Kostenvoranschlag - Only if applicable */}
        {(ticket.estimated_price || ticket.price_mode === 'KVA') && (
          <PdfBox title="F) Kostenvoranschlag" className="pdf-grid-full">
            <div className="pdf-grid" style={{ marginTop: '1mm' }}>
              <div>
                <PdfDataRow label="Preismodell" value={priceModeLabel} />
                {ticket.estimated_price && (
                  <PdfDataRow label="Reparaturpreis" value={`${ticket.estimated_price.toFixed(2)} €`} />
                )}
              </div>
              <div>
                {ticket.kva_fee_applicable && (
                  <PdfDataRow 
                    label="KVA-Gebühr bei Nicht-Reparatur" 
                    value={`${(ticket.kva_fee_amount || 19.90).toFixed(2)} €`} 
                  />
                )}
                <PdfDataRow label="Kostenlose Entsorgung" value="Optional möglich" />
              </div>
            </div>
          </PdfBox>
        )}
      </div>

      {/* G) Wichtige Hinweise */}
      <PdfConditions title="G) Wichtige Hinweise & Einverständnis" text={conditions} />

      {/* H) Unterschriften */}
      <PdfSignatures />

      <PdfFooter />
    </div>
  );
};

// ============= DOCUMENT: KOSTENVORANSCHLAG (KVA) =============

export const KvaDocument = ({ 
  ticket, 
  partUsage 
}: { 
  ticket: TicketData; 
  partUsage?: PartUsage[];
}) => {
  const today = format(new Date(), 'dd.MM.yyyy', { locale: de });
  const deviceType = DEVICE_TYPE_LABELS[ticket.device?.device_type as DeviceType] || ticket.device?.device_type;
  const errorLabel = ERROR_CODE_LABELS[ticket.error_code as ErrorCode] || ticket.error_code || 'Sonstiges';
  const deviceId = getDeviceIdentifier(ticket.device);
  
  const totalPartsPrice = partUsage?.reduce((sum, p) => sum + (p.unit_sales_price || 0) * p.quantity, 0) || 0;
  const repairPrice = ticket.estimated_price || 0;
  const totalPrice = repairPrice + totalPartsPrice;

  const statusBadge = ticket.kva_approved === true 
    ? 'pdf-status-approved' 
    : 'pdf-status-pending';
  
  const statusText = ticket.kva_approved === true 
    ? 'Freigegeben' 
    : 'Ausstehend';

  const kvaFee = (ticket.kva_fee_amount || 19.90).toFixed(2);

  const conditions = `Dieser Kostenvoranschlag ist 14 Tage gültig. Preise inkl. MwSt.

Bitte wählen Sie eine der folgenden Optionen:
☐ Reparatur durchführen (zum angegebenen Preis)
☐ Gerät unrepariert zurückgeben (KVA-Gebühr: ${kvaFee} €)
☐ Gerät zur kostenlosen Entsorgung überlassen

Mit der Freigabe stimme ich der Durchführung der Reparatur zu den oben genannten Bedingungen zu.`;

  return (
    <div className="pdf-document">
      <PdfHeader 
        title="KOSTENVORANSCHLAG (KVA)"
        ticketNumber={ticket.ticket_number}
        date={today}
      />

      <div className="pdf-highlight" style={{ marginBottom: '4mm' }}>
        Status: <span className={`pdf-status-badge ${statusBadge}`}>{statusText}</span>
      </div>

      <div className="pdf-grid">
        <PdfBox title="Kunde">
          <PdfDataRow label="Name" value={`${ticket.customer?.first_name} ${ticket.customer?.last_name}`} />
          <PdfDataRow label="Telefon" value={ticket.customer?.phone} />
          {ticket.customer?.email && <PdfDataRow label="E-Mail" value={ticket.customer.email} />}
        </PdfBox>

        <PdfBox title="Gerät">
          <PdfDataRow label="Gerätetyp" value={deviceType} />
          <PdfDataRow label="Modell" value={`${ticket.device?.brand} ${ticket.device?.model}`} />
          <PdfDataRow label={deviceId.label} value={deviceId.value} mono={!deviceId.unreadable} />
        </PdfBox>

        <PdfBox title="Diagnose / Geplante Arbeiten" className="pdf-grid-full">
          <PdfDataRow label="Fehler" value={errorLabel} />
          <div className="pdf-text-block" style={{ marginTop: '2mm' }}>
            {ticket.error_description_text || 'Diagnose abgeschlossen'}
          </div>
        </PdfBox>

        <PdfBox title="Kostenaufstellung" className="pdf-grid-full">
          <table className="pdf-price-table">
            <thead>
              <tr>
                <th>Position</th>
                <th style={{ width: '15mm', textAlign: 'center' }}>Menge</th>
                <th style={{ width: '25mm' }}>Einzelpreis</th>
                <th style={{ width: '25mm' }}>Gesamt</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Reparaturarbeiten ({errorLabel})</td>
                <td style={{ textAlign: 'center' }}>1</td>
                <td style={{ textAlign: 'right' }}>{repairPrice.toFixed(2)} €</td>
                <td style={{ textAlign: 'right' }}>{repairPrice.toFixed(2)} €</td>
              </tr>
              {partUsage && partUsage.length > 0 && partUsage.map((usage) => (
                <tr key={usage.id}>
                  <td>{usage.part?.name || 'Ersatzteil'}</td>
                  <td style={{ textAlign: 'center' }}>{usage.quantity}</td>
                  <td style={{ textAlign: 'right' }}>{(usage.unit_sales_price || 0).toFixed(2)} €</td>
                  <td style={{ textAlign: 'right' }}>{((usage.unit_sales_price || 0) * usage.quantity).toFixed(2)} €</td>
                </tr>
              ))}
              <tr className="pdf-price-total">
                <td colSpan={3}><strong>Gesamtbetrag (inkl. MwSt.)</strong></td>
                <td style={{ textAlign: 'right' }}><strong>{totalPrice.toFixed(2)} €</strong></td>
              </tr>
            </tbody>
          </table>
        </PdfBox>
      </div>

      <PdfConditions title="Optionen & Einverständnis" text={conditions} />

      <PdfSignatures showEmployee={false} />

      <PdfFooter />
    </div>
  );
};

// ============= DOCUMENT: REPARATURBERICHT =============

export const RepairReportDocument = ({ 
  ticket, 
  partUsage 
}: { 
  ticket: TicketData; 
  partUsage?: PartUsage[];
}) => {
  const today = format(new Date(), 'dd.MM.yyyy', { locale: de });
  const deviceType = DEVICE_TYPE_LABELS[ticket.device?.device_type as DeviceType] || ticket.device?.device_type;
  const errorLabel = ERROR_CODE_LABELS[ticket.error_code as ErrorCode] || ticket.error_code || 'Sonstiges';
  const statusLabel = STATUS_LABELS[ticket.status] || ticket.status;
  const deviceId = getDeviceIdentifier(ticket.device);
  
  const totalPartsPrice = partUsage?.reduce((sum, p) => sum + (p.unit_sales_price || 0) * p.quantity, 0) || 0;
  const finalPrice = ticket.final_price || ticket.estimated_price || 0;
  const totalPrice = finalPrice + totalPartsPrice;

  const conditions = `• Auf verbaute Ersatzteile gewähren wir 6 Monate Garantie gemäß unseren AGB.
• Bei der Entgegennahme bitte Gerät auf Funktion prüfen.
• Reklamationen sind innerhalb von 14 Tagen nach Abholung zu melden.`;

  return (
    <div className="pdf-document">
      <PdfHeader 
        title="REPARATURBERICHT / FERTIGMELDUNG"
        ticketNumber={ticket.ticket_number}
        date={today}
      />

      <div className="pdf-highlight" style={{ marginBottom: '4mm' }}>
        Status: <span className="pdf-status-badge pdf-status-completed">{statusLabel}</span>
      </div>

      <div className="pdf-grid">
        <PdfBox title="Kunde">
          <PdfDataRow label="Name" value={`${ticket.customer?.first_name} ${ticket.customer?.last_name}`} />
          <PdfDataRow label="Telefon" value={ticket.customer?.phone} />
          {ticket.customer?.email && <PdfDataRow label="E-Mail" value={ticket.customer.email} />}
        </PdfBox>

        <PdfBox title="Gerät">
          <PdfDataRow label="Gerätetyp" value={deviceType} />
          <PdfDataRow label="Modell" value={`${ticket.device?.brand} ${ticket.device?.model}`} />
          <PdfDataRow label={deviceId.label} value={deviceId.value} mono={!deviceId.unreadable} />
        </PdfBox>

        <PdfBox title="Durchgeführte Arbeiten" className="pdf-grid-full">
          <PdfDataRow label="Reparaturart" value={errorLabel} />
          <div className="pdf-text-block" style={{ marginTop: '2mm' }}>
            {ticket.error_description_text || 'Reparatur erfolgreich abgeschlossen'}
          </div>
        </PdfBox>

        {partUsage && partUsage.length > 0 && (
          <PdfBox title="Verwendete Ersatzteile" className="pdf-grid-full">
            <table className="pdf-price-table">
              <thead>
                <tr>
                  <th>Bauteil</th>
                  <th style={{ width: '15mm', textAlign: 'center' }}>Menge</th>
                  <th style={{ width: '25mm' }}>Preis</th>
                </tr>
              </thead>
              <tbody>
                {partUsage.map((usage) => (
                  <tr key={usage.id}>
                    <td>{usage.part?.name || 'Ersatzteil'}</td>
                    <td style={{ textAlign: 'center' }}>{usage.quantity}</td>
                    <td style={{ textAlign: 'right' }}>{((usage.unit_sales_price || 0) * usage.quantity).toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PdfBox>
        )}

        <PdfBox title="Endabrechnung" className="pdf-grid-full">
          <div className="pdf-grid">
            <div>
              <PdfDataRow label="Reparaturkosten" value={`${finalPrice.toFixed(2)} €`} />
              {totalPartsPrice > 0 && (
                <PdfDataRow label="Ersatzteile" value={`${totalPartsPrice.toFixed(2)} €`} />
              )}
            </div>
            <div>
              <PdfDataRow label="Gesamtbetrag (inkl. MwSt.)" value={<strong>{totalPrice.toFixed(2)} €</strong>} />
            </div>
          </div>
        </PdfBox>
      </div>

      <PdfConditions title="Garantie & Hinweise" text={conditions} />

      <PdfSignatures />

      <PdfFooter />
    </div>
  );
};

// ============= DOCUMENT: LIEFERSCHEIN =============

export const DeliveryNoteDocument = ({ 
  ticket, 
  partUsage 
}: { 
  ticket: TicketData; 
  partUsage?: PartUsage[];
}) => {
  const today = format(new Date(), 'dd.MM.yyyy', { locale: de });
  const deviceType = DEVICE_TYPE_LABELS[ticket.device?.device_type as DeviceType] || ticket.device?.device_type;
  const deviceId = getDeviceIdentifier(ticket.device);
  
  const totalPartsPrice = partUsage?.reduce((sum, p) => sum + (p.unit_sales_price || 0) * p.quantity, 0) || 0;
  const finalPrice = ticket.final_price || ticket.estimated_price || 0;
  const totalPrice = finalPrice + totalPartsPrice;

  const conditions = `Bitte prüfen Sie die Sendung bei Erhalt auf Vollständigkeit und Funktion.
Eventuelle Transportschäden sind sofort beim Zusteller zu reklamieren.`;

  return (
    <div className="pdf-document">
      <PdfHeader 
        title="LIEFERSCHEIN / ABHOLBELEG"
        ticketNumber={ticket.ticket_number}
        date={today}
      />

      <div className="pdf-grid">
        <PdfBox title="Empfänger">
          <PdfDataRow label="Name" value={`${ticket.customer?.first_name} ${ticket.customer?.last_name}`} />
          {ticket.customer?.address && <PdfDataRow label="Adresse" value={ticket.customer.address} />}
          <PdfDataRow label="Telefon" value={ticket.customer?.phone} />
        </PdfBox>

        <PdfBox title="Abholort">
          <PdfDataRow label="Filiale" value={ticket.location?.name || 'Hauptfiliale'} />
          {ticket.location?.address && <PdfDataRow label="Adresse" value={ticket.location.address} />}
          {ticket.location?.phone && <PdfDataRow label="Telefon" value={ticket.location.phone} />}
        </PdfBox>

        <PdfBox title="Gerät" className="pdf-grid-full">
          <div className="pdf-grid">
            <div>
              <PdfDataRow label="Gerätetyp" value={deviceType} />
              <PdfDataRow label="Hersteller" value={ticket.device?.brand} />
              <PdfDataRow label="Modell" value={ticket.device?.model} />
            </div>
            <div>
              <PdfDataRow label={deviceId.label} value={deviceId.value} mono={!deviceId.unreadable} />
              {ticket.device?.color && <PdfDataRow label="Farbe" value={ticket.device.color} />}
            </div>
          </div>
        </PdfBox>

        {partUsage && partUsage.length > 0 && (
          <PdfBox title="Verwendete Ersatzteile" className="pdf-grid-full">
            <table className="pdf-price-table">
              <thead>
                <tr>
                  <th>Bauteil</th>
                  <th style={{ width: '15mm', textAlign: 'center' }}>Menge</th>
                  <th style={{ width: '25mm' }}>Preis</th>
                </tr>
              </thead>
              <tbody>
                {partUsage.map((usage) => (
                  <tr key={usage.id}>
                    <td>{usage.part?.name || 'Ersatzteil'}</td>
                    <td style={{ textAlign: 'center' }}>{usage.quantity}</td>
                    <td style={{ textAlign: 'right' }}>{((usage.unit_sales_price || 0) * usage.quantity).toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PdfBox>
        )}

        <PdfBox title="Betrag" className="pdf-grid-full">
          <div className="pdf-grid">
            <div>
              <PdfDataRow label="Reparatur" value={`${finalPrice.toFixed(2)} €`} />
              {totalPartsPrice > 0 && <PdfDataRow label="Ersatzteile" value={`${totalPartsPrice.toFixed(2)} €`} />}
            </div>
            <div>
              <PdfDataRow label="Gesamtbetrag" value={<strong>{totalPrice.toFixed(2)} €</strong>} />
            </div>
          </div>
        </PdfBox>

        {ticket.accessories && (
          <PdfBox title="Rückgabe Zubehör" className="pdf-grid-full">
            <div className="pdf-text-block">{ticket.accessories}</div>
          </PdfBox>
        )}
      </div>

      <PdfConditions title="Hinweise" text={conditions} />

      <PdfSignatures />

      <PdfFooter />
    </div>
  );
};
