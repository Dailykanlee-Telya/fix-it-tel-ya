// PDF Styles specifically for Technical Documentation
// Optimized for multi-page A4 documents with code blocks and tables

import { TELYA_COLORS } from './pdf-styles';

export const DOC_PDF_STYLES = `
  /* Base Reset */
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  
  /* Page Setup - A4 Portrait for Documentation */
  @page {
    size: A4 portrait;
    margin: 15mm 12mm 12mm 12mm;
  }
  
  @page :first {
    margin-top: 0;
  }
  
  html, body {
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
    font-size: 9pt;
    line-height: 1.5;
    color: ${TELYA_COLORS.textDark};
    background: ${TELYA_COLORS.white};
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  
  /* Document Container */
  .doc-container {
    width: 100%;
    max-width: 186mm;
    margin: 0 auto;
  }
  
  /* ============ COVER PAGE ============ */
  .doc-cover {
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    page-break-after: always;
    background: linear-gradient(180deg, ${TELYA_COLORS.white} 0%, ${TELYA_COLORS.secondaryBlue} 100%);
  }
  
  .doc-cover-logo {
    width: 60mm;
    height: auto;
    margin-bottom: 15mm;
  }
  
  .doc-cover-title {
    font-size: 28pt;
    font-weight: 700;
    color: ${TELYA_COLORS.primaryBlue};
    margin-bottom: 5mm;
    letter-spacing: 0.5mm;
  }
  
  .doc-cover-subtitle {
    font-size: 14pt;
    color: ${TELYA_COLORS.textMuted};
    margin-bottom: 20mm;
  }
  
  .doc-cover-meta {
    font-size: 10pt;
    color: ${TELYA_COLORS.textMuted};
    line-height: 2;
  }
  
  .doc-cover-version {
    font-weight: 600;
    color: ${TELYA_COLORS.primaryBlue};
  }
  
  /* ============ TABLE OF CONTENTS ============ */
  .doc-toc {
    page-break-after: always;
    padding: 10mm 0;
  }
  
  .doc-toc-title {
    font-size: 18pt;
    font-weight: 700;
    color: ${TELYA_COLORS.primaryBlue};
    margin-bottom: 10mm;
    padding-bottom: 3mm;
    border-bottom: 2px solid ${TELYA_COLORS.primaryBlue};
  }
  
  .doc-toc-list {
    list-style: none;
  }
  
  .doc-toc-chapter {
    display: flex;
    align-items: baseline;
    padding: 2mm 0;
    font-size: 11pt;
    border-bottom: 1px dotted ${TELYA_COLORS.borderLight};
  }
  
  .doc-toc-chapter:hover {
    background: ${TELYA_COLORS.secondaryBlueLight};
  }
  
  .doc-toc-number {
    font-weight: 700;
    color: ${TELYA_COLORS.primaryBlue};
    min-width: 12mm;
  }
  
  .doc-toc-text {
    flex: 1;
    color: ${TELYA_COLORS.textDark};
  }
  
  .doc-toc-page {
    font-weight: 600;
    color: ${TELYA_COLORS.textMuted};
    min-width: 10mm;
    text-align: right;
  }
  
  .doc-toc-section {
    display: flex;
    align-items: baseline;
    padding: 1.5mm 0 1.5mm 8mm;
    font-size: 9pt;
    color: ${TELYA_COLORS.textMuted};
  }
  
  /* ============ CHAPTERS ============ */
  .doc-chapter {
    page-break-before: always;
  }
  
  .doc-chapter:first-of-type {
    page-break-before: auto;
  }
  
  .doc-chapter-header {
    background: linear-gradient(90deg, ${TELYA_COLORS.primaryBlue} 0%, ${TELYA_COLORS.primaryBlueLight} 100%);
    color: ${TELYA_COLORS.white};
    padding: 5mm 6mm;
    margin-bottom: 6mm;
    border-radius: 2mm;
  }
  
  .doc-chapter-number {
    font-size: 10pt;
    font-weight: 600;
    opacity: 0.8;
    margin-bottom: 1mm;
  }
  
  .doc-chapter-title {
    font-size: 16pt;
    font-weight: 700;
    letter-spacing: 0.3mm;
  }
  
  /* ============ SECTIONS ============ */
  .doc-section {
    margin-bottom: 6mm;
  }
  
  .doc-section-title {
    font-size: 12pt;
    font-weight: 700;
    color: ${TELYA_COLORS.primaryBlue};
    margin-bottom: 3mm;
    padding-bottom: 1.5mm;
    border-bottom: 1px solid ${TELYA_COLORS.borderLight};
  }
  
  .doc-section-content {
    font-size: 9pt;
    line-height: 1.6;
    color: ${TELYA_COLORS.textDark};
    white-space: pre-wrap;
  }
  
  .doc-section-content p {
    margin-bottom: 2mm;
  }
  
  /* ============ CODE BLOCKS ============ */
  .doc-code-block {
    background: #1e1e1e;
    border-radius: 2mm;
    margin: 3mm 0;
    overflow: hidden;
    page-break-inside: avoid;
  }
  
  .doc-code-header {
    background: #2d2d2d;
    padding: 2mm 3mm;
    border-bottom: 1px solid #3d3d3d;
    display: flex;
    align-items: center;
    gap: 2mm;
  }
  
  .doc-code-lang {
    font-size: 7pt;
    font-weight: 600;
    text-transform: uppercase;
    color: #888;
    background: #3d3d3d;
    padding: 0.5mm 2mm;
    border-radius: 1mm;
  }
  
  .doc-code-title {
    font-size: 8pt;
    color: #aaa;
  }
  
  .doc-code-content {
    padding: 3mm;
    overflow-x: auto;
  }
  
  .doc-code-content pre {
    margin: 0;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 7.5pt;
    line-height: 1.5;
    color: #d4d4d4;
    white-space: pre-wrap;
    word-break: break-word;
  }
  
  /* Syntax highlighting colors */
  .doc-code-content .keyword {
    color: #569cd6;
  }
  
  .doc-code-content .string {
    color: #ce9178;
  }
  
  .doc-code-content .comment {
    color: #6a9955;
    font-style: italic;
  }
  
  .doc-code-content .function {
    color: #dcdcaa;
  }
  
  .doc-code-content .type {
    color: #4ec9b0;
  }
  
  /* ============ TABLES ============ */
  .doc-table-container {
    margin: 3mm 0;
    overflow-x: auto;
    page-break-inside: avoid;
  }
  
  .doc-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8pt;
  }
  
  .doc-table th {
    background: ${TELYA_COLORS.primaryBlue};
    color: ${TELYA_COLORS.white};
    padding: 2.5mm 3mm;
    text-align: left;
    font-weight: 600;
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.2mm;
  }
  
  .doc-table td {
    padding: 2mm 3mm;
    border-bottom: 1px solid ${TELYA_COLORS.borderLight};
    vertical-align: top;
  }
  
  .doc-table tr:nth-child(even) td {
    background: ${TELYA_COLORS.secondaryBlueLight};
  }
  
  .doc-table tr:hover td {
    background: ${TELYA_COLORS.secondaryBlue};
  }
  
  .doc-table-check {
    color: #28a745;
    font-weight: bold;
  }
  
  .doc-table-cross {
    color: #dc3545;
    font-weight: bold;
  }
  
  /* ============ INFO BOXES ============ */
  .doc-info-box {
    background: ${TELYA_COLORS.secondaryBlue};
    border-left: 4px solid ${TELYA_COLORS.primaryBlue};
    padding: 3mm 4mm;
    margin: 3mm 0;
    border-radius: 0 2mm 2mm 0;
  }
  
  .doc-warning-box {
    background: #fff3cd;
    border-left: 4px solid #ffc107;
    padding: 3mm 4mm;
    margin: 3mm 0;
    border-radius: 0 2mm 2mm 0;
  }
  
  .doc-danger-box {
    background: #f8d7da;
    border-left: 4px solid #dc3545;
    padding: 3mm 4mm;
    margin: 3mm 0;
    border-radius: 0 2mm 2mm 0;
  }
  
  /* ============ LISTS ============ */
  .doc-list {
    margin: 2mm 0 2mm 5mm;
    padding-left: 3mm;
  }
  
  .doc-list li {
    margin-bottom: 1.5mm;
    line-height: 1.5;
  }
  
  .doc-list-bullet {
    list-style-type: disc;
  }
  
  .doc-list-numbered {
    list-style-type: decimal;
  }
  
  /* ============ PAGE FOOTER ============ */
  .doc-page-footer {
    position: fixed;
    bottom: 5mm;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 7pt;
    color: ${TELYA_COLORS.textLight};
    border-top: 1px solid ${TELYA_COLORS.borderLight};
    padding-top: 2mm;
  }
  
  /* ============ APPENDIX ============ */
  .doc-appendix {
    page-break-before: always;
  }
  
  .doc-appendix-title {
    font-size: 14pt;
    font-weight: 700;
    color: ${TELYA_COLORS.primaryBlue};
    margin-bottom: 5mm;
  }
  
  .doc-enum-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 4mm;
  }
  
  .doc-enum-card {
    background: ${TELYA_COLORS.secondaryBlueLight};
    border: 1px solid ${TELYA_COLORS.borderLight};
    border-radius: 2mm;
    padding: 3mm;
  }
  
  .doc-enum-name {
    font-weight: 700;
    color: ${TELYA_COLORS.primaryBlue};
    font-size: 9pt;
    margin-bottom: 2mm;
    font-family: 'Consolas', monospace;
  }
  
  .doc-enum-values {
    font-size: 7.5pt;
    color: ${TELYA_COLORS.textMuted};
    line-height: 1.6;
  }
  
  /* ============ PRINT OPTIMIZATIONS ============ */
  @media print {
    .doc-chapter {
      page-break-before: always;
    }
    
    .doc-code-block,
    .doc-table-container {
      page-break-inside: avoid;
    }
    
    .doc-section {
      page-break-inside: avoid;
    }
  }
`;
