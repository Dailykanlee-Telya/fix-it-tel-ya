import React, { useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import telyaLogo from '@/assets/telya-logo.png';
import { DEVICE_TYPE_LABELS, DeviceType } from '@/types/database';

interface PickupReceiptProps {
  ticket: any;
  autoPrint?: boolean;
  onPrintComplete?: () => void;
}

export default function PickupReceipt({ ticket, autoPrint = false, onPrintComplete }: PickupReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!receiptRef.current) return;

    const ticketNumber = ticket.ticket_number || 'Auftrag';
    const pdfFilename = `Abholschein-${ticketNumber}`;

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
          <style>
            @page { 
              size: 80mm auto; 
              margin: 2mm; 
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            html, body { 
              width: 80mm;
              font-family: 'Arial', sans-serif;
              font-size: 10px;
              line-height: 1.3;
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact;
            }
            .receipt {
              width: 76mm;
              padding: 2mm;
            }
            .header {
              text-align: center;
              margin-bottom: 3mm;
              padding-bottom: 2mm;
              border-bottom: 1px dashed #333;
            }
            .logo {
              width: 15mm;
              height: 15mm;
              border-radius: 50%;
              margin: 0 auto 2mm;
              display: block;
            }
            .title {
              font-size: 14px;
              font-weight: bold;
              letter-spacing: 1px;
              margin-top: 2mm;
            }
            .ticket-number {
              font-size: 16px;
              font-weight: bold;
              margin: 3mm 0;
              padding: 2mm;
              background: #f0f0f0;
              border-radius: 2mm;
              text-align: center;
            }
            .section {
              margin: 2mm 0;
              padding-bottom: 2mm;
              border-bottom: 1px dotted #ccc;
            }
            .section-title {
              font-size: 9px;
              font-weight: bold;
              text-transform: uppercase;
              color: #666;
              margin-bottom: 1mm;
            }
            .data-row {
              display: flex;
              justify-content: space-between;
              margin: 0.5mm 0;
            }
            .data-label {
              color: #666;
              font-size: 9px;
            }
            .data-value {
              font-weight: 500;
              font-size: 10px;
              text-align: right;
              max-width: 45mm;
              word-wrap: break-word;
            }
            .mono {
              font-family: 'Courier New', monospace;
              font-size: 9px;
            }
            .error-desc {
              font-size: 9px;
              margin-top: 1mm;
              padding: 1mm;
              background: #f9f9f9;
              border-radius: 1mm;
            }
            .notice {
              margin-top: 3mm;
              padding: 2mm;
              background: #fff3cd;
              border: 1px solid #ffc107;
              border-radius: 2mm;
              font-size: 8px;
              text-align: center;
            }
            .notice-icon {
              font-size: 12px;
              margin-bottom: 1mm;
            }
            .footer {
              margin-top: 3mm;
              text-align: center;
              font-size: 8px;
              color: #666;
            }
            .datetime {
              font-size: 9px;
              text-align: center;
              margin: 2mm 0;
            }
          </style>
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
  const identNumber = isPhone 
    ? ticket.device?.imei_or_serial 
    : (ticket.device?.serial_number || ticket.device?.imei_or_serial);
  const identLabel = isPhone ? 'IMEI' : 'Seriennummer';

  return (
    <div>
      {/* Hidden receipt for printing */}
      <div ref={receiptRef} style={{ display: 'none' }}>
        <div className="receipt">
          <div className="header">
            <img src={telyaLogo} alt="Telya" className="logo" />
            <div className="title">ABHOLSCHEIN</div>
          </div>

          <div className="ticket-number">
            {ticket.ticket_number}
          </div>

          <div className="datetime">
            {format(new Date(ticket.created_at), 'dd.MM.yyyy HH:mm', { locale: de })} Uhr
          </div>

          <div className="section">
            <div className="section-title">Kunde</div>
            <div className="data-row">
              <span className="data-label">Name:</span>
              <span className="data-value">{ticket.customer?.first_name} {ticket.customer?.last_name}</span>
            </div>
            {ticket.customer?.phone && (
              <div className="data-row">
                <span className="data-label">Tel:</span>
                <span className="data-value">{ticket.customer.phone}</span>
              </div>
            )}
          </div>

          <div className="section">
            <div className="section-title">Gerät</div>
            <div className="data-row">
              <span className="data-label">Hersteller:</span>
              <span className="data-value">{ticket.device?.brand}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Modell:</span>
              <span className="data-value">{ticket.device?.model}</span>
            </div>
            {ticket.device?.color && (
              <div className="data-row">
                <span className="data-label">Farbe:</span>
                <span className="data-value">{ticket.device.color}</span>
              </div>
            )}
            {identNumber && (
              <div className="data-row">
                <span className="data-label">{identLabel}:</span>
                <span className="data-value mono">{identNumber}</span>
              </div>
            )}
          </div>

          {ticket.error_description_text && (
            <div className="section">
              <div className="section-title">Fehler</div>
              <div className="error-desc">
                {ticket.error_description_text.substring(0, 100)}
                {ticket.error_description_text.length > 100 ? '...' : ''}
              </div>
            </div>
          )}

          {ticket.location?.name && (
            <div className="section">
              <div className="section-title">Filiale</div>
              <div className="data-value" style={{ textAlign: 'left' }}>{ticket.location.name}</div>
            </div>
          )}

          <div className="notice">
            <div className="notice-icon">⚠️</div>
            <strong>Bitte bringen Sie diesen Abholschein bei der Abholung mit.</strong>
            <br />
            Ohne Abholschein kann eine Ausweiskontrolle erforderlich sein.
          </div>

          <div className="footer">
            Telya GmbH · www.repariert.de
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
        Abholschein drucken
      </button>
    </div>
  );
}
