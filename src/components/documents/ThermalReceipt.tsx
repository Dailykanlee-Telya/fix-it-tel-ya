import React, { useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { DEVICE_TYPE_LABELS, DeviceType } from '@/types/database';
import { TELYA_ADDRESS } from '@/types/b2b';
import { BON_STYLES, generatePdfFilename } from '@/lib/pdf-styles';
import { DOCUMENT_LOGOS } from '@/lib/document-logo';
import { LEGAL_TEXTS } from '@/lib/legal-texts';
import { QRCodeSVG } from 'qrcode.react';
import { getBaseUrl } from '@/lib/base-url';

interface ThermalReceiptProps {
  ticket: any;
  autoPrint?: boolean;
  onPrintComplete?: () => void;
}

export default function ThermalReceipt({ 
  ticket, 
  autoPrint = false, 
  onPrintComplete 
}: ThermalReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!receiptRef.current) return;

    const ticketNumber = ticket.ticket_number || 'Auftrag';
    const pdfFilename = generatePdfFilename('abholschein', ticketNumber);

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
      onPrintComplete?.();
    };

    window.addEventListener('afterprint', cleanup, { once: true });
    iframe.contentWindow?.addEventListener('afterprint', cleanup, { once: true });

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${pdfFilename}</title>
          <style>${BON_STYLES}</style>
        </head>
        <body>
          ${receiptRef.current.innerHTML}
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

  useEffect(() => {
    if (autoPrint && ticket) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPrint, ticket]);

  if (!ticket) return null;

  const deviceType = DEVICE_TYPE_LABELS[ticket.device?.device_type as DeviceType] || ticket.device?.device_type;
  const isPhone = ticket.device?.device_type === 'HANDY';
  
  // Handle IMEI/Serial with unreadable flags
  let identNumber = '-';
  let identLabel = isPhone ? 'IMEI' : 'Seriennr.';
  
  if (isPhone) {
    if (ticket.device?.imei_unreadable) {
      identNumber = '☐ Nicht lesbar';
    } else {
      identNumber = ticket.device?.imei_or_serial || '-';
    }
  } else {
    if (ticket.device?.serial_unreadable) {
      identNumber = '☐ Nicht lesbar';
    } else {
      identNumber = ticket.device?.serial_number || ticket.device?.imei_or_serial || '-';
    }
  }
  
  const createdDate = format(new Date(ticket.created_at), 'dd.MM.yyyy HH:mm', { locale: de });
  const trackingCode = ticket.kva_token || '';
  const customerEmail = ticket.customer?.email || '';
  
  // Generate tracking URL with email + code (production domain only)
  const baseUrl = getBaseUrl();
  const trackingUrl = customerEmail && trackingCode 
    ? `${baseUrl}/track?email=${encodeURIComponent(customerEmail)}&code=${encodeURIComponent(trackingCode)}`
    : `${baseUrl}/track`;

  return (
    <div>
      {/* Hidden receipt for printing */}
      <div ref={receiptRef} style={{ display: 'none' }}>
        <div className="bon-receipt">
          {/* Header with Logo */}
          <div className="bon-header">
            <div className="bon-logo-container">
              <img 
                src={DOCUMENT_LOGOS.thermal} 
                alt="Telya" 
                className="bon-logo"
                crossOrigin="anonymous"
              />
            </div>
            <div className="bon-title">ABHOLSCHEIN</div>
            <div className="bon-subtitle">{TELYA_ADDRESS.name}</div>
            {ticket.location?.name && (
              <div className="bon-subtitle">Filiale: {ticket.location.name}</div>
            )}
          </div>

          {/* Order Number - Prominent */}
          <div className="bon-order-number">
            {ticket.ticket_number}
          </div>

          {/* Tracking Code - Very Prominent */}
          <div className="bon-tracking-code">
            <div className="bon-tracking-label">Trackingcode</div>
            <div className="bon-tracking-value">{trackingCode}</div>
          </div>

          {/* Date/Time */}
          <div className="bon-datetime">
            Annahme: {createdDate} Uhr
          </div>

          {/* Customer Section */}
          <div className="bon-section">
            <div className="bon-section-title">Kunde</div>
            <div className="bon-row">
              <span className="bon-label">Name:</span>
              <span className="bon-value">{ticket.customer?.first_name} {ticket.customer?.last_name}</span>
            </div>
            {ticket.customer?.phone && (
              <div className="bon-row">
                <span className="bon-label">Tel:</span>
                <span className="bon-value">{ticket.customer.phone}</span>
              </div>
            )}
            {ticket.customer?.email && (
              <div className="bon-row">
                <span className="bon-label">E-Mail:</span>
                <span className="bon-value" style={{ fontSize: '8px' }}>{ticket.customer.email}</span>
              </div>
            )}
          </div>

          {/* Device Section */}
          <div className="bon-section">
            <div className="bon-section-title">Gerät</div>
            <div className="bon-row">
              <span className="bon-label">Typ:</span>
              <span className="bon-value">{deviceType}</span>
            </div>
            <div className="bon-row">
              <span className="bon-label">Hersteller:</span>
              <span className="bon-value">{ticket.device?.brand}</span>
            </div>
            <div className="bon-row">
              <span className="bon-label">Modell:</span>
              <span className="bon-value">{ticket.device?.model}</span>
            </div>
            {ticket.device?.color && (
              <div className="bon-row">
                <span className="bon-label">Farbe:</span>
                <span className="bon-value">{ticket.device.color}</span>
              </div>
            )}
            <div className="bon-row">
              <span className="bon-label">{identLabel}:</span>
              <span className={`bon-value ${!identNumber.includes('Nicht lesbar') ? 'bon-mono' : ''}`}>{identNumber}</span>
            </div>
          </div>

          {/* Error Section */}
          {ticket.error_description_text && (
            <div className="bon-section">
              <div className="bon-section-title">Fehlerbeschreibung</div>
              <div className="bon-error">
                {ticket.error_description_text.substring(0, 100)}
                {ticket.error_description_text.length > 100 ? '...' : ''}
              </div>
            </div>
          )}

          {/* QR Code for Status Tracking */}
          {trackingCode && customerEmail && (
            <div className="bon-qr-section">
              <div className="bon-qr-title">Status online abrufen:</div>
              <div className="bon-qr-code">
                <QRCodeSVG 
                  value={trackingUrl}
                  size={80}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <div className="bon-qr-hint">QR-Code scannen oder</div>
              <div className="bon-qr-url">www.telya.de/track</div>
              <div className="bon-qr-info">E-Mail + Trackingcode eingeben</div>
            </div>
          )}

          {/* Legal Notices - Required by law */}
          <div className="bon-legal">
            <div className="bon-legal-title">Wichtige Hinweise</div>
            <div className="bon-legal-item">
              <strong>Datensicherung:</strong> {LEGAL_TEXTS.datensicherung}
            </div>
            <div className="bon-legal-item">
              <strong>Haftung:</strong> {LEGAL_TEXTS.haftung}
            </div>
            <div className="bon-legal-item">
              <strong>KVA:</strong> {LEGAL_TEXTS.kva}
            </div>
            <div className="bon-legal-item">
              <strong>Abholung:</strong> {LEGAL_TEXTS.abholung}
            </div>
            <div className="bon-legal-item">
              <strong>Datenschutz:</strong> {LEGAL_TEXTS.datenschutz}
            </div>
            <div className="bon-legal-item">
              {LEGAL_TEXTS.agb}
            </div>
          </div>

          {/* Signature Area */}
          <div className="bon-signature">
            <div className="bon-signature-line"></div>
            <div className="bon-signature-label">Unterschrift Kunde</div>
          </div>

          {/* Notice Box */}
          <div className="bon-notice">
            <div className="bon-notice-icon">📋</div>
            <div className="bon-notice-text">
              Bitte bringen Sie diesen Abholschein mit!
            </div>
            <div className="bon-notice-sub">
              Ohne Abholschein ist eine Ausweiskontrolle erforderlich.
            </div>
          </div>

          {/* Footer */}
          <div className="bon-footer">
            <div className="bon-footer-company">{TELYA_ADDRESS.name}</div>
            <div>{TELYA_ADDRESS.street}</div>
            <div>{TELYA_ADDRESS.zip} {TELYA_ADDRESS.city}</div>
            <div>Tel: {TELYA_ADDRESS.phone}</div>
            <div>www.telya.de</div>
          </div>
        </div>
      </div>

      {/* Visible button to trigger print */}
      <button
        onClick={handlePrint}
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 6 2 18 2 18 9" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect width="12" height="8" x="6" y="14" />
        </svg>
        Abholschein (Bon)
      </button>
    </div>
  );
}
