import React, { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useB2BAuth } from '@/hooks/useB2BAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Printer } from 'lucide-react';
import { PDF_STYLES, generatePdfFilename } from '@/lib/pdf-styles';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { STATUS_LABELS, TicketStatus, DEVICE_TYPE_LABELS, DeviceType, ERROR_CODE_LABELS, ErrorCode } from '@/types/database';

interface B2BTicketDocumentsProps {
  ticket: any;
  partUsage?: any[];
}

/**
 * B2B White-Label document view
 * Shows only print buttons (no preview) with B2B partner branding
 */
export default function B2BTicketDocuments({ ticket, partUsage }: B2BTicketDocumentsProps) {
  const { b2bPartner } = useB2BAuth();
  
  // Print via dedicated iframe with partner branding
  const handlePrint = (docType: 'eingangsbeleg' | 'reparaturbericht' | 'lieferschein') => {
    if (!ticket) return;

    const ticketNumber = ticket.ticket_number || 'Auftrag';
    const pdfFilename = generatePdfFilename(docType, ticketNumber);

    const originalTitle = document.title;
    document.title = pdfFilename;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.left = '-9999px';
    iframe.src = 'about:blank';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.title = originalTitle;
      document.body.removeChild(iframe);
      return;
    }

    const cleanup = () => {
      document.title = originalTitle;
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    };

    window.addEventListener('afterprint', cleanup, { once: true });
    iframe.contentWindow?.addEventListener('afterprint', cleanup, { once: true });

    // Generate document HTML with partner branding
    const documentHtml = generateB2BDocument(ticket, docType, b2bPartner, partUsage);

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${pdfFilename}</title>
          <style>${PDF_STYLES}</style>
        </head>
        <body>
          ${documentHtml}
        </body>
      </html>
    `);
    iframeDoc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(cleanup, 4000);
    }, 150);
  };

  const showRepairReport = ['IN_REPARATUR', 'FERTIG_ZUR_ABHOLUNG', 'ABGEHOLT', 'RUECKVERSAND_AN_B2B', 'RUECKVERSAND_AN_ENDKUNDE'].includes(ticket.status);
  const showDeliveryNote = ['FERTIG_ZUR_ABHOLUNG', 'ABGEHOLT', 'RUECKVERSAND_AN_B2B', 'RUECKVERSAND_AN_ENDKUNDE'].includes(ticket.status);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Dokumente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {/* Eingangsbeleg */}
          <Button variant="outline" onClick={() => handlePrint('eingangsbeleg')}>
            <Printer className="h-4 w-4 mr-2" />
            Eingangsbeleg drucken
          </Button>

          {/* Reparaturbericht - only if status allows */}
          {showRepairReport && (
            <Button variant="outline" onClick={() => handlePrint('reparaturbericht')}>
              <Printer className="h-4 w-4 mr-2" />
              Reparaturbericht drucken
            </Button>
          )}

          {/* Lieferschein - only if ready for pickup/shipped */}
          {showDeliveryNote && (
            <Button variant="outline" onClick={() => handlePrint('lieferschein')}>
              <Printer className="h-4 w-4 mr-2" />
              Lieferschein drucken
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Die Dokumente werden mit Ihrem Firmenbranding erstellt.
        </p>
      </CardContent>
    </Card>
  );
}

// Generate B2B white-label document HTML
function generateB2BDocument(
  ticket: any, 
  docType: 'eingangsbeleg' | 'reparaturbericht' | 'lieferschein',
  partner: any,
  partUsage?: any[]
): string {
  const partnerName = partner?.name || 'Partner';
  const partnerSlogan = partner?.company_slogan || '';
  const partnerAddress = [partner?.street, `${partner?.zip || ''} ${partner?.city || ''}`].filter(Boolean).join(', ');
  const partnerPhone = partner?.contact_phone || '';
  const partnerEmail = partner?.contact_email || '';
  const partnerLogo = partner?.company_logo_url || '';
  const legalFooter = partner?.legal_footer || '';
  const primaryColor = partner?.primary_color || '#1e3a5f';

  const createdDate = format(new Date(ticket.created_at), 'dd.MM.yyyy HH:mm', { locale: de });
  const today = format(new Date(), 'dd.MM.yyyy', { locale: de });
  const deviceType = DEVICE_TYPE_LABELS[ticket.device?.device_type as DeviceType] || ticket.device?.device_type;
  const errorLabel = ERROR_CODE_LABELS[ticket.error_code as ErrorCode] || ticket.error_code || 'Sonstiges';
  const statusLabel = STATUS_LABELS[ticket.status as TicketStatus] || ticket.status;

  // Device identifier
  const isPhone = ticket.device?.device_type === 'HANDY';
  const deviceIdLabel = isPhone ? 'IMEI' : 'Seriennummer';
  const deviceIdValue = isPhone 
    ? (ticket.device?.imei_unreadable ? 'Nicht lesbar' : ticket.device?.imei_or_serial || '-')
    : (ticket.device?.serial_unreadable ? 'Nicht lesbar' : ticket.device?.serial_number || ticket.device?.imei_or_serial || '-');

  // Customer info (B2B customer if available)
  const customerName = `${ticket.customer?.first_name || ''} ${ticket.customer?.last_name || ''}`.trim() || 'Kunde';
  const customerPhone = ticket.customer?.phone || '';
  const customerEmail = ticket.customer?.email || '';
  const customerAddress = ticket.customer?.address || '';

  // Prices
  const finalPrice = ticket.final_price || ticket.estimated_price || 0;
  const totalPartsPrice = partUsage?.reduce((sum, p) => sum + (p.unit_sales_price || 0) * p.quantity, 0) || 0;
  const totalPrice = finalPrice + totalPartsPrice;

  // Header with partner branding
  const header = `
    <div class="pdf-header" style="background: linear-gradient(135deg, ${primaryColor} 0%, ${adjustColor(primaryColor, 20)} 100%);">
      <div class="pdf-header-left">
        ${partnerLogo ? `<div class="pdf-logo-container"><img src="${partnerLogo}" alt="${partnerName}" class="pdf-logo" crossorigin="anonymous" /></div>` : ''}
        <div class="pdf-header-title">${getDocTitle(docType)}</div>
        <div class="pdf-header-subtitle">${partnerName}${partnerSlogan ? ` · ${partnerSlogan}` : ''}</div>
      </div>
      <div class="pdf-header-right">
        <div class="pdf-order-number">${ticket.ticket_number}</div>
        <div class="pdf-date">${docType === 'eingangsbeleg' ? createdDate : today}</div>
      </div>
    </div>
  `;

  // Footer with partner info
  const footer = `
    <div class="pdf-footer">
      <div class="pdf-footer-company">${partnerName}</div>
      <div class="pdf-footer-details">
        ${partnerAddress}${partnerPhone ? ` · Tel: ${partnerPhone}` : ''}${partnerEmail ? ` · ${partnerEmail}` : ''}
        ${legalFooter ? `<br />${legalFooter}` : ''}
      </div>
    </div>
  `;

  // Document-specific content
  let content = '';

  if (docType === 'eingangsbeleg') {
    content = `
      <div class="pdf-grid">
        <div class="pdf-box">
          <div class="pdf-box-header">Kundendaten</div>
          <div class="pdf-data-row"><span class="pdf-data-label">Name:</span><span class="pdf-data-value">${customerName}</span></div>
          ${customerAddress ? `<div class="pdf-data-row"><span class="pdf-data-label">Adresse:</span><span class="pdf-data-value">${customerAddress}</span></div>` : ''}
          <div class="pdf-data-row"><span class="pdf-data-label">Telefon:</span><span class="pdf-data-value">${customerPhone}</span></div>
          ${customerEmail ? `<div class="pdf-data-row"><span class="pdf-data-label">E-Mail:</span><span class="pdf-data-value">${customerEmail}</span></div>` : ''}
        </div>
        <div class="pdf-box">
          <div class="pdf-box-header">Auftragsdaten</div>
          <div class="pdf-data-row"><span class="pdf-data-label">Datum:</span><span class="pdf-data-value">${createdDate}</span></div>
          <div class="pdf-data-row"><span class="pdf-data-label">Status:</span><span class="pdf-data-value">${statusLabel}</span></div>
          ${ticket.endcustomer_reference ? `<div class="pdf-data-row"><span class="pdf-data-label">Referenz:</span><span class="pdf-data-value">${ticket.endcustomer_reference}</span></div>` : ''}
        </div>
        <div class="pdf-box">
          <div class="pdf-box-header">Gerätedaten</div>
          <div class="pdf-data-row"><span class="pdf-data-label">Gerätetyp:</span><span class="pdf-data-value">${deviceType}</span></div>
          <div class="pdf-data-row"><span class="pdf-data-label">Hersteller:</span><span class="pdf-data-value">${ticket.device?.brand}</span></div>
          <div class="pdf-data-row"><span class="pdf-data-label">Modell:</span><span class="pdf-data-value">${ticket.device?.model}</span></div>
          <div class="pdf-data-row"><span class="pdf-data-label">${deviceIdLabel}:</span><span class="pdf-data-value pdf-data-mono">${deviceIdValue}</span></div>
          ${ticket.device?.color ? `<div class="pdf-data-row"><span class="pdf-data-label">Farbe:</span><span class="pdf-data-value">${ticket.device.color}</span></div>` : ''}
        </div>
        <div class="pdf-box">
          <div class="pdf-box-header">Zubehör</div>
          <div class="pdf-text-block">${ticket.accessories || 'Kein Zubehör abgegeben'}</div>
        </div>
        <div class="pdf-box pdf-grid-full">
          <div class="pdf-box-header">Fehlerbeschreibung</div>
          <div class="pdf-data-row"><span class="pdf-data-label">Fehlertyp:</span><span class="pdf-data-value">${errorLabel}</span></div>
          <div class="pdf-text-block" style="margin-top: 2mm;">${ticket.error_description_text || 'Keine detaillierte Beschreibung'}</div>
        </div>
      </div>
      <div class="pdf-signatures">
        <div class="pdf-signature-box">
          <div class="pdf-signature-line">Unterschrift Kunde</div>
          <div class="pdf-signature-sub">Ort, Datum</div>
        </div>
        <div class="pdf-signature-box">
          <div class="pdf-signature-line">Unterschrift Mitarbeiter</div>
          <div class="pdf-signature-sub">${partnerName}</div>
        </div>
      </div>
    `;
  } else if (docType === 'reparaturbericht') {
    content = `
      <div class="pdf-highlight" style="margin-bottom: 4mm;">
        Status: <span class="pdf-status-badge pdf-status-completed">${statusLabel}</span>
      </div>
      <div class="pdf-grid">
        <div class="pdf-box">
          <div class="pdf-box-header">Kunde</div>
          <div class="pdf-data-row"><span class="pdf-data-label">Name:</span><span class="pdf-data-value">${customerName}</span></div>
          <div class="pdf-data-row"><span class="pdf-data-label">Telefon:</span><span class="pdf-data-value">${customerPhone}</span></div>
        </div>
        <div class="pdf-box">
          <div class="pdf-box-header">Gerät</div>
          <div class="pdf-data-row"><span class="pdf-data-label">Modell:</span><span class="pdf-data-value">${ticket.device?.brand} ${ticket.device?.model}</span></div>
          <div class="pdf-data-row"><span class="pdf-data-label">${deviceIdLabel}:</span><span class="pdf-data-value pdf-data-mono">${deviceIdValue}</span></div>
        </div>
        <div class="pdf-box pdf-grid-full">
          <div class="pdf-box-header">Durchgeführte Arbeiten</div>
          <div class="pdf-data-row"><span class="pdf-data-label">Reparaturart:</span><span class="pdf-data-value">${errorLabel}</span></div>
          <div class="pdf-text-block" style="margin-top: 2mm;">${ticket.error_description_text || 'Reparatur abgeschlossen'}</div>
        </div>
        ${partUsage && partUsage.length > 0 ? `
          <div class="pdf-box pdf-grid-full">
            <div class="pdf-box-header">Verwendete Ersatzteile</div>
            <table class="pdf-price-table">
              <thead><tr><th>Bauteil</th><th style="width:15mm;text-align:center;">Menge</th><th style="width:25mm;">Preis</th></tr></thead>
              <tbody>
                ${partUsage.map(p => `<tr><td>${p.part?.name || 'Ersatzteil'}</td><td style="text-align:center;">${p.quantity}</td><td style="text-align:right;">${((p.unit_sales_price || 0) * p.quantity).toFixed(2)} €</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
        <div class="pdf-box pdf-grid-full">
          <div class="pdf-box-header">Endabrechnung</div>
          <div class="pdf-grid">
            <div>
              <div class="pdf-data-row"><span class="pdf-data-label">Reparaturkosten:</span><span class="pdf-data-value">${finalPrice.toFixed(2)} €</span></div>
              ${totalPartsPrice > 0 ? `<div class="pdf-data-row"><span class="pdf-data-label">Ersatzteile:</span><span class="pdf-data-value">${totalPartsPrice.toFixed(2)} €</span></div>` : ''}
            </div>
            <div>
              <div class="pdf-data-row"><span class="pdf-data-label">Gesamtbetrag:</span><span class="pdf-data-value"><strong>${totalPrice.toFixed(2)} €</strong></span></div>
            </div>
          </div>
        </div>
      </div>
      <div class="pdf-conditions">
        <div class="pdf-conditions-title">Garantie & Hinweise</div>
        <div class="pdf-conditions-text">• Auf verbaute Ersatzteile gewähren wir 6 Monate Garantie.
• Bei der Entgegennahme bitte Gerät auf Funktion prüfen.
• Reklamationen sind innerhalb von 14 Tagen nach Abholung zu melden.</div>
      </div>
      <div class="pdf-signatures">
        <div class="pdf-signature-box">
          <div class="pdf-signature-line">Unterschrift Kunde</div>
          <div class="pdf-signature-sub">Ort, Datum</div>
        </div>
        <div class="pdf-signature-box">
          <div class="pdf-signature-line">Unterschrift Mitarbeiter</div>
          <div class="pdf-signature-sub">${partnerName}</div>
        </div>
      </div>
    `;
  } else if (docType === 'lieferschein') {
    content = `
      <div class="pdf-grid">
        <div class="pdf-box">
          <div class="pdf-box-header">Empfänger</div>
          <div class="pdf-data-row"><span class="pdf-data-label">Name:</span><span class="pdf-data-value">${customerName}</span></div>
          ${customerAddress ? `<div class="pdf-data-row"><span class="pdf-data-label">Adresse:</span><span class="pdf-data-value">${customerAddress}</span></div>` : ''}
          <div class="pdf-data-row"><span class="pdf-data-label">Telefon:</span><span class="pdf-data-value">${customerPhone}</span></div>
        </div>
        <div class="pdf-box">
          <div class="pdf-box-header">Absender</div>
          <div class="pdf-data-row"><span class="pdf-data-label">Firma:</span><span class="pdf-data-value">${partnerName}</span></div>
          ${partnerAddress ? `<div class="pdf-data-row"><span class="pdf-data-label">Adresse:</span><span class="pdf-data-value">${partnerAddress}</span></div>` : ''}
          ${partnerPhone ? `<div class="pdf-data-row"><span class="pdf-data-label">Telefon:</span><span class="pdf-data-value">${partnerPhone}</span></div>` : ''}
        </div>
        <div class="pdf-box pdf-grid-full">
          <div class="pdf-box-header">Gerät</div>
          <div class="pdf-grid">
            <div>
              <div class="pdf-data-row"><span class="pdf-data-label">Gerätetyp:</span><span class="pdf-data-value">${deviceType}</span></div>
              <div class="pdf-data-row"><span class="pdf-data-label">Hersteller:</span><span class="pdf-data-value">${ticket.device?.brand}</span></div>
              <div class="pdf-data-row"><span class="pdf-data-label">Modell:</span><span class="pdf-data-value">${ticket.device?.model}</span></div>
            </div>
            <div>
              <div class="pdf-data-row"><span class="pdf-data-label">${deviceIdLabel}:</span><span class="pdf-data-value pdf-data-mono">${deviceIdValue}</span></div>
              ${ticket.device?.color ? `<div class="pdf-data-row"><span class="pdf-data-label">Farbe:</span><span class="pdf-data-value">${ticket.device.color}</span></div>` : ''}
            </div>
          </div>
        </div>
        <div class="pdf-box pdf-grid-full">
          <div class="pdf-box-header">Betrag</div>
          <div class="pdf-grid">
            <div>
              <div class="pdf-data-row"><span class="pdf-data-label">Reparatur:</span><span class="pdf-data-value">${finalPrice.toFixed(2)} €</span></div>
              ${totalPartsPrice > 0 ? `<div class="pdf-data-row"><span class="pdf-data-label">Ersatzteile:</span><span class="pdf-data-value">${totalPartsPrice.toFixed(2)} €</span></div>` : ''}
            </div>
            <div>
              <div class="pdf-data-row"><span class="pdf-data-label">Gesamtbetrag:</span><span class="pdf-data-value"><strong>${totalPrice.toFixed(2)} €</strong></span></div>
            </div>
          </div>
        </div>
        ${ticket.accessories ? `
          <div class="pdf-box pdf-grid-full">
            <div class="pdf-box-header">Rückgabe Zubehör</div>
            <div class="pdf-text-block">${ticket.accessories}</div>
          </div>
        ` : ''}
      </div>
      <div class="pdf-conditions">
        <div class="pdf-conditions-title">Hinweise</div>
        <div class="pdf-conditions-text">Bitte prüfen Sie die Sendung bei Erhalt auf Vollständigkeit und Funktion.
Eventuelle Transportschäden sind sofort beim Zusteller zu reklamieren.</div>
      </div>
      <div class="pdf-signatures">
        <div class="pdf-signature-box">
          <div class="pdf-signature-line">Unterschrift Empfänger</div>
          <div class="pdf-signature-sub">Ort, Datum</div>
        </div>
        <div class="pdf-signature-box">
          <div class="pdf-signature-line">Unterschrift Absender</div>
          <div class="pdf-signature-sub">${partnerName}</div>
        </div>
      </div>
    `;
  }

  return `
    <div class="pdf-document">
      ${header}
      ${content}
      ${footer}
    </div>
  `;
}

function getDocTitle(docType: string): string {
  switch (docType) {
    case 'eingangsbeleg': return 'REPARATURBEGLEITSCHEIN / EINGANGSBESTÄTIGUNG';
    case 'reparaturbericht': return 'REPARATURBERICHT / FERTIGMELDUNG';
    case 'lieferschein': return 'LIEFERSCHEIN / ABHOLBELEG';
    default: return 'DOKUMENT';
  }
}

// Adjust color brightness
function adjustColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  ).toString(16).slice(1);
}
