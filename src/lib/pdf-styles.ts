// PDF Document Styles for Telya Corporate Design
// All colors are Telya Blue based - professional and clean

export const TELYA_COLORS = {
  // Primary Telya Blue - professional, trustworthy
  primaryBlue: '#1e3a5f',
  primaryBlueLight: '#2d4a73',
  // Secondary - very light blue for backgrounds
  secondaryBlue: '#e8f0f7',
  secondaryBlueLight: '#f4f8fc',
  // Neutrals
  textDark: '#1a1a1a',
  textMuted: '#5a6a7a',
  textLight: '#8a9aaa',
  borderLight: '#d4e0ec',
  white: '#ffffff',
};

export const PDF_STYLES = `
  /* Base Reset */
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  
  /* Page Setup - A4 Portrait */
  @page {
    size: A4 portrait;
    margin: 12mm 10mm 10mm 10mm;
  }
  
  html, body {
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
    font-size: 9pt;
    line-height: 1.4;
    color: ${TELYA_COLORS.textDark};
    background: ${TELYA_COLORS.white};
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  
  /* Document Container */
  .pdf-document {
    width: 100%;
    max-width: 190mm;
    padding: 0;
    background: ${TELYA_COLORS.white};
  }
  
  /* Logo Styles */
  .pdf-logo-container {
    display: flex;
    align-items: center;
    margin-bottom: 2mm;
  }
  
  .pdf-logo {
    height: 14mm;
    max-height: 14mm;
    width: auto;
    object-fit: contain;
  }
  
  /* Header Section */
  .pdf-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 4mm;
    margin-bottom: 4mm;
    border-bottom: 2px solid ${TELYA_COLORS.primaryBlue};
  }
  
  .pdf-header-left {
    display: flex;
    flex-direction: column;
    gap: 1mm;
  }
  
  .pdf-header-title {
    font-size: 16pt;
    font-weight: 700;
    color: ${TELYA_COLORS.primaryBlue};
    letter-spacing: 0.3mm;
  }
  
  .pdf-header-subtitle {
    font-size: 7pt;
    color: ${TELYA_COLORS.textMuted};
    font-style: italic;
  }
  
  .pdf-header-right {
    text-align: right;
  }
  
  .pdf-order-number {
    font-size: 14pt;
    font-weight: 700;
    color: ${TELYA_COLORS.primaryBlue};
    font-family: 'Consolas', 'Monaco', monospace;
  }
  
  .pdf-date {
    font-size: 8pt;
    color: ${TELYA_COLORS.textMuted};
    margin-top: 1mm;
  }
  
  /* Content Grid - 2 Column Layout */
  .pdf-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4mm;
    margin-bottom: 4mm;
  }
  
  .pdf-grid-full {
    grid-column: 1 / -1;
  }
  
  /* Content Boxes */
  .pdf-box {
    background: ${TELYA_COLORS.secondaryBlueLight};
    border: 1px solid ${TELYA_COLORS.borderLight};
    border-radius: 2mm;
    padding: 3mm;
  }
  
  .pdf-box-header {
    font-size: 8pt;
    font-weight: 600;
    color: ${TELYA_COLORS.primaryBlue};
    text-transform: uppercase;
    letter-spacing: 0.3mm;
    margin-bottom: 2mm;
    padding-bottom: 1mm;
    border-bottom: 1px solid ${TELYA_COLORS.borderLight};
  }
  
  /* Data Rows */
  .pdf-data-row {
    display: flex;
    justify-content: space-between;
    padding: 0.8mm 0;
    font-size: 8.5pt;
  }
  
  .pdf-data-row:not(:last-child) {
    border-bottom: 1px dotted ${TELYA_COLORS.borderLight};
  }
  
  .pdf-data-label {
    color: ${TELYA_COLORS.textMuted};
    flex-shrink: 0;
    padding-right: 2mm;
  }
  
  .pdf-data-value {
    font-weight: 500;
    text-align: right;
    word-break: break-word;
  }
  
  .pdf-data-mono {
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 8pt;
  }
  
  /* Text Blocks */
  .pdf-text-block {
    font-size: 8.5pt;
    line-height: 1.5;
    color: ${TELYA_COLORS.textDark};
  }
  
  /* Price Table */
  .pdf-price-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
    margin-top: 2mm;
  }
  
  .pdf-price-table th {
    background: ${TELYA_COLORS.primaryBlue};
    color: ${TELYA_COLORS.white};
    padding: 2mm;
    text-align: left;
    font-weight: 600;
    font-size: 8pt;
  }
  
  .pdf-price-table th:last-child,
  .pdf-price-table td:last-child {
    text-align: right;
  }
  
  .pdf-price-table td {
    padding: 2mm;
    border-bottom: 1px solid ${TELYA_COLORS.borderLight};
  }
  
  .pdf-price-table tr:nth-child(even) td {
    background: ${TELYA_COLORS.secondaryBlueLight};
  }
  
  .pdf-price-total {
    font-weight: 700;
    background: ${TELYA_COLORS.secondaryBlue} !important;
  }
  
  /* Legal / Conditions Box */
  .pdf-conditions {
    background: ${TELYA_COLORS.secondaryBlue};
    border: 1px solid ${TELYA_COLORS.borderLight};
    border-radius: 2mm;
    padding: 3mm;
    margin-top: 3mm;
  }
  
  .pdf-conditions-title {
    font-size: 8pt;
    font-weight: 600;
    color: ${TELYA_COLORS.primaryBlue};
    margin-bottom: 2mm;
  }
  
  .pdf-conditions-text {
    font-size: 7pt;
    line-height: 1.4;
    color: ${TELYA_COLORS.textMuted};
    white-space: pre-wrap;
  }
  
  /* Signature Area */
  .pdf-signatures {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10mm;
    margin-top: 6mm;
    padding-top: 4mm;
    border-top: 1px solid ${TELYA_COLORS.borderLight};
  }
  
  .pdf-signature-box {
    padding-top: 12mm;
  }
  
  .pdf-signature-line {
    border-top: 1px solid ${TELYA_COLORS.textDark};
    padding-top: 1mm;
    font-size: 7pt;
    color: ${TELYA_COLORS.textMuted};
  }
  
  .pdf-signature-sub {
    font-size: 6.5pt;
    color: ${TELYA_COLORS.textLight};
    margin-top: 0.5mm;
  }
  
  /* Footer */
  .pdf-footer {
    margin-top: 4mm;
    padding-top: 3mm;
    border-top: 2px solid ${TELYA_COLORS.primaryBlue};
    text-align: center;
    font-size: 7pt;
    color: ${TELYA_COLORS.textMuted};
  }
  
  .pdf-footer-company {
    font-weight: 600;
    color: ${TELYA_COLORS.primaryBlue};
    margin-bottom: 1mm;
  }
  
  .pdf-footer-details {
    line-height: 1.6;
  }
  
  .pdf-footer-website {
    font-weight: 500;
    color: ${TELYA_COLORS.primaryBlue};
    margin-top: 1mm;
  }
  
  /* KVA Status Badge */
  .pdf-status-badge {
    display: inline-block;
    padding: 1mm 3mm;
    border-radius: 1mm;
    font-size: 7.5pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.2mm;
  }
  
  .pdf-status-pending {
    background: #fff3cd;
    color: #856404;
    border: 1px solid #ffc107;
  }
  
  .pdf-status-approved {
    background: #d4edda;
    color: #155724;
    border: 1px solid #28a745;
  }
  
  .pdf-status-completed {
    background: ${TELYA_COLORS.secondaryBlue};
    color: ${TELYA_COLORS.primaryBlue};
    border: 1px solid ${TELYA_COLORS.primaryBlue};
  }
  
  /* Highlight Box */
  .pdf-highlight {
    background: ${TELYA_COLORS.secondaryBlue};
    border-left: 3px solid ${TELYA_COLORS.primaryBlue};
    padding: 2mm 3mm;
    font-size: 8pt;
  }
`;

export const BON_STYLES = `
  /* Thermal Printer Receipt (80mm width) - HIGH CONTRAST */
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
    font-family: 'Arial', 'Helvetica', sans-serif;
    font-size: 11px;
    font-weight: 500;
    line-height: 1.4;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    background: white;
    color: #000000;
  }
  
  .bon-receipt {
    width: 76mm;
    padding: 2mm;
    color: #000000;
  }
  
  .bon-header {
    text-align: center;
    padding-bottom: 3mm;
    border-bottom: 2px solid #000000;
    margin-bottom: 3mm;
  }
  
  .bon-logo-container {
    text-align: center;
    margin-bottom: 2mm;
  }
  
  .bon-logo {
    max-width: 32mm;
    height: auto;
    object-fit: contain;
    display: block;
    margin: 0 auto;
  }
  
  .bon-title {
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: #000000;
    text-transform: uppercase;
  }
  
  .bon-subtitle {
    font-size: 10px;
    font-weight: 600;
    color: #000000;
    margin-top: 1mm;
  }
  
  /* ORDER NUMBER - VERY PROMINENT */
  .bon-order-number {
    font-size: 22px;
    font-weight: 700;
    text-align: center;
    padding: 3mm 2mm;
    margin: 2mm 0;
    background: #000000;
    color: #ffffff;
    border-radius: 2mm;
    letter-spacing: 1px;
  }
  
  /* TRACKING CODE - PROMINENT */
  .bon-tracking-code {
    text-align: center;
    margin: 2mm 0;
    padding: 3mm;
    background: #f0f0f0;
    border: 2px solid #000000;
    border-radius: 2mm;
  }
  
  .bon-tracking-label {
    font-size: 9px;
    font-weight: 700;
    color: #000000;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 1mm;
  }
  
  .bon-tracking-value {
    font-size: 20px;
    font-weight: 700;
    font-family: 'Courier New', monospace;
    letter-spacing: 3px;
    color: #000000;
  }
  
  .bon-datetime {
    text-align: center;
    font-size: 10px;
    font-weight: 600;
    color: #000000;
    margin-bottom: 3mm;
  }
  
  .bon-section {
    margin: 3mm 0;
    padding-bottom: 2mm;
    border-bottom: 1px solid #000000;
  }
  
  .bon-section-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    color: #000000;
    margin-bottom: 2mm;
    letter-spacing: 0.5px;
    border-bottom: 1px solid #000000;
    padding-bottom: 1mm;
  }
  
  .bon-row {
    display: flex;
    justify-content: space-between;
    margin: 1.5mm 0;
    font-size: 11px;
  }
  
  .bon-label {
    font-weight: 600;
    color: #000000;
  }
  
  .bon-value {
    font-weight: 700;
    text-align: right;
    max-width: 42mm;
    word-wrap: break-word;
    color: #000000;
  }
  
  .bon-mono {
    font-family: 'Courier New', monospace;
    font-size: 10px;
    font-weight: 700;
  }
  
  .bon-error {
    font-size: 10px;
    font-weight: 500;
    padding: 2mm;
    background: #f0f0f0;
    border: 1px solid #000000;
    border-radius: 1mm;
    margin-top: 1mm;
    color: #000000;
  }
  
  .bon-notice {
    margin: 3mm 0;
    padding: 3mm;
    background: #ffffff;
    border: 2px solid #000000;
    border-radius: 2mm;
    text-align: center;
  }
  
  .bon-notice-icon {
    font-size: 14px;
    margin-bottom: 1mm;
  }
  
  .bon-notice-text {
    font-size: 11px;
    font-weight: 700;
    margin-bottom: 1mm;
    color: #000000;
  }
  
  .bon-notice-sub {
    font-size: 9px;
    font-weight: 600;
    color: #000000;
  }

  /* Data Security Warning */
  .bon-warning {
    margin: 3mm 0;
    padding: 2mm;
    background: #ffffff;
    border: 2px solid #000000;
    border-radius: 2mm;
    text-align: center;
  }
  
  .bon-warning-icon {
    font-size: 12px;
    margin-bottom: 1mm;
  }
  
  .bon-warning-text {
    font-size: 9px;
    font-weight: 600;
    color: #000000;
    line-height: 1.3;
  }
  
  /* QR Code Section */
  .bon-qr-section {
    margin: 3mm 0;
    padding: 3mm;
    border: 2px solid #000000;
    border-radius: 2mm;
    text-align: center;
  }
  
  .bon-qr-title {
    font-size: 10px;
    font-weight: 700;
    margin-bottom: 2mm;
    color: #000000;
  }
  
  .bon-qr-code {
    display: flex;
    justify-content: center;
    margin: 2mm 0;
  }
  
  .bon-qr-code svg {
    width: 85px !important;
    height: 85px !important;
  }
  
  .bon-qr-hint {
    font-size: 9px;
    font-weight: 600;
    color: #000000;
  }
  
  .bon-qr-url {
    font-size: 11px;
    font-weight: 700;
    color: #000000;
    margin-top: 1mm;
  }
  
  .bon-qr-info {
    font-size: 9px;
    font-weight: 600;
    color: #000000;
    margin-top: 1mm;
  }

  /* Legal Notices Section */
  .bon-legal {
    margin: 3mm 0;
    padding: 2mm;
    border: 1px solid #000000;
    border-radius: 2mm;
    font-size: 7px;
    line-height: 1.35;
    color: #000000;
  }
  
  .bon-legal-title {
    font-size: 9px;
    font-weight: 700;
    color: #000000;
    text-transform: uppercase;
    margin-bottom: 2mm;
    border-bottom: 1px solid #000000;
    padding-bottom: 1mm;
  }
  
  .bon-legal-item {
    margin-bottom: 1.5mm;
    font-weight: 500;
  }
  
  .bon-legal-item strong {
    font-weight: 700;
    color: #000000;
  }
  
  /* Signature Area */
  .bon-signature {
    margin: 4mm 0;
    text-align: center;
  }
  
  .bon-signature-line {
    border-top: 2px solid #000000;
    width: 60mm;
    margin: 0 auto 1mm auto;
    padding-top: 12mm;
  }
  
  .bon-signature-label {
    font-size: 9px;
    font-weight: 600;
    color: #000000;
  }
  
  .bon-footer {
    text-align: center;
    font-size: 9px;
    font-weight: 600;
    color: #000000;
    margin-top: 3mm;
    padding-top: 2mm;
    border-top: 2px solid #000000;
  }
  
  .bon-footer-company {
    font-weight: 700;
    color: #000000;
    margin-bottom: 1mm;
    font-size: 10px;
  }
`;

export const generatePdfFilename = (docType: string, ticketNumber: string): string => {
  const typeMap: Record<string, string> = {
    'eingangsbeleg': 'Reparaturbegleitschein',
    'kva': 'Kostenvoranschlag',
    'reparaturbericht': 'Reparaturbericht',
    'lieferschein': 'Lieferschein',
    'abholschein': 'Abholschein',
  };
  
  const typeName = typeMap[docType] || docType;
  
  // Format: Telya_[Dokumenttyp]_[Auftragsnummer].pdf
  // Ticket number already comes without dashes from DB
  return `Telya_${typeName}_${ticketNumber}.pdf`;
};
