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
  /* Thermal Printer Receipt (80mm width) */
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
    font-size: 10px;
    line-height: 1.35;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    background: white;
  }
  
  .bon-receipt {
    width: 76mm;
    padding: 2mm;
  }
  
  .bon-header {
    text-align: center;
    padding-bottom: 3mm;
    border-bottom: 2px dashed ${TELYA_COLORS.textDark};
    margin-bottom: 3mm;
  }
  
  .bon-logo-container {
    text-align: center;
    margin-bottom: 2mm;
  }
  
  .bon-logo {
    max-width: 30mm;
    height: auto;
    object-fit: contain;
    display: block;
    margin: 0 auto;
  }
  
  .bon-title {
    font-size: 14px;
    font-weight: bold;
    letter-spacing: 1px;
  }
  
  .bon-subtitle {
    font-size: 8px;
    color: ${TELYA_COLORS.textMuted};
    margin-top: 1mm;
  }
  
  .bon-order-number {
    font-size: 18px;
    font-weight: bold;
    text-align: center;
    padding: 3mm 2mm;
    margin: 2mm 0;
    background: #f0f0f0;
    border-radius: 2mm;
  }
  
  .bon-datetime {
    text-align: center;
    font-size: 9px;
    color: ${TELYA_COLORS.textMuted};
    margin-bottom: 3mm;
  }
  
  .bon-section {
    margin: 2mm 0;
    padding-bottom: 2mm;
    border-bottom: 1px dotted ${TELYA_COLORS.textLight};
  }
  
  .bon-section-title {
    font-size: 8px;
    font-weight: bold;
    text-transform: uppercase;
    color: ${TELYA_COLORS.textMuted};
    margin-bottom: 1.5mm;
    letter-spacing: 0.5px;
  }
  
  .bon-row {
    display: flex;
    justify-content: space-between;
    margin: 0.8mm 0;
    font-size: 9px;
  }
  
  .bon-label {
    color: ${TELYA_COLORS.textMuted};
  }
  
  .bon-value {
    font-weight: 500;
    text-align: right;
    max-width: 42mm;
    word-wrap: break-word;
  }
  
  .bon-mono {
    font-family: 'Courier New', monospace;
    font-size: 8px;
  }
  
  .bon-error {
    font-size: 8px;
    padding: 1.5mm;
    background: #f8f8f8;
    border-radius: 1mm;
    margin-top: 1mm;
  }
  
  .bon-notice {
    margin: 3mm 0;
    padding: 2.5mm;
    background: #fff8e1;
    border: 1px solid #ffc107;
    border-radius: 2mm;
    text-align: center;
    font-size: 8px;
  }
  
  .bon-notice-icon {
    font-size: 12px;
    margin-bottom: 1mm;
  }
  
  .bon-notice-text {
    font-weight: 600;
    margin-bottom: 1mm;
  }
  
  .bon-notice-sub {
    font-size: 7px;
    color: ${TELYA_COLORS.textMuted};
  }
  
  /* Data Security Warning */
  .bon-warning {
    margin: 3mm 0;
    padding: 2mm;
    background: #ffebee;
    border: 1px solid #ef5350;
    border-radius: 2mm;
    text-align: center;
    font-size: 7px;
  }
  
  .bon-warning-icon {
    font-size: 10px;
    margin-bottom: 1mm;
  }
  
  .bon-warning-text {
    color: #c62828;
    line-height: 1.3;
  }
  
  /* QR Code Section */
  .bon-qr-section {
    margin: 3mm 0;
    padding: 2.5mm;
    border: 1px dashed ${TELYA_COLORS.textLight};
    border-radius: 2mm;
    text-align: center;
  }
  
  .bon-qr-title {
    font-size: 8px;
    font-weight: 600;
    margin-bottom: 2mm;
    color: ${TELYA_COLORS.primaryBlue};
  }
  
  .bon-qr-code {
    display: flex;
    justify-content: center;
    margin: 2mm 0;
  }
  
  .bon-qr-code svg {
    width: 80px !important;
    height: 80px !important;
  }
  
  .bon-qr-hint {
    font-size: 7px;
    color: ${TELYA_COLORS.textMuted};
  }
  
  .bon-qr-url {
    font-size: 8px;
    font-weight: 600;
    color: ${TELYA_COLORS.primaryBlue};
  }
  
  .bon-qr-info {
    font-size: 6px;
    color: ${TELYA_COLORS.textMuted};
    margin-top: 0.5mm;
  }
  
  /* Tracking Code Highlight */
  .bon-tracking-code {
    text-align: center;
    margin: 2mm 0;
    padding: 2mm;
    background: #f0f0f0;
    border-radius: 2mm;
  }
  
  .bon-tracking-label {
    font-size: 7px;
    color: ${TELYA_COLORS.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .bon-tracking-value {
    font-size: 16px;
    font-weight: bold;
    font-family: 'Courier New', monospace;
    letter-spacing: 2px;
    color: ${TELYA_COLORS.primaryBlue};
  }
  
  /* Legal Notices Section */
  .bon-legal {
    margin: 3mm 0;
    padding: 2mm;
    border: 1px solid ${TELYA_COLORS.borderLight};
    border-radius: 2mm;
    font-size: 6px;
    line-height: 1.4;
    color: ${TELYA_COLORS.textMuted};
  }
  
  .bon-legal-title {
    font-size: 7px;
    font-weight: 600;
    color: ${TELYA_COLORS.primaryBlue};
    text-transform: uppercase;
    margin-bottom: 1.5mm;
    border-bottom: 1px dotted ${TELYA_COLORS.borderLight};
    padding-bottom: 1mm;
  }
  
  .bon-legal-item {
    margin-bottom: 1mm;
  }
  
  .bon-legal-item strong {
    color: ${TELYA_COLORS.textDark};
  }
  
  /* Signature Area */
  .bon-signature {
    margin: 4mm 0;
    text-align: center;
  }
  
  .bon-signature-line {
    border-top: 1px solid ${TELYA_COLORS.textDark};
    width: 60mm;
    margin: 0 auto 1mm auto;
    padding-top: 10mm;
  }
  
  .bon-signature-label {
    font-size: 7px;
    color: ${TELYA_COLORS.textMuted};
  }
  
  .bon-footer {
    text-align: center;
    font-size: 8px;
    color: ${TELYA_COLORS.textMuted};
    margin-top: 3mm;
    padding-top: 2mm;
    border-top: 2px dashed ${TELYA_COLORS.textLight};
  }
  
  .bon-footer-company {
    font-weight: 600;
    color: ${TELYA_COLORS.primaryBlue};
    margin-bottom: 0.5mm;
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
