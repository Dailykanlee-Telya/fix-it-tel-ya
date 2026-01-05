/**
 * Standard legal texts for documents (German law compliant)
 * These are the required disclaimers for repair services
 */

export const LEGAL_TEXTS = {
  // Data Protection (DSGVO)
  datenschutz: `Personenbezogene Daten werden ausschließlich zur Abwicklung des Reparaturauftrags gemäß Art. 6 Abs. 1 lit. b DSGVO verarbeitet. Infos unter www.telya.de/datenschutz.`,
  
  // Data Backup Disclaimer
  datensicherung: `Für Datenverluste übernehmen wir keine Haftung. Bitte sichern Sie Ihre Daten vor Abgabe.`,
  
  // Liability Disclaimer
  haftung: `Für bereits vorhandene Schäden sowie Folgeschäden, insbesondere bei Flüssigkeitsschäden, wird keine Haftung übernommen.`,
  
  // KVA Notice
  kva: `Reparaturen erfolgen erst nach Freigabe eines Kostenvoranschlags. Bei Ablehnung kann eine Prüfpauschale anfallen.`,
  
  // Pickup Notice
  abholung: `Geräte sind innerhalb von 14 Tagen nach Benachrichtigung abzuholen. Danach Lagerkosten oder Entsorgung möglich.`,
  
  // Terms Reference
  agb: `Es gelten unsere AGB unter www.telya.de/agb.`,
  
  // Warranty
  garantie: `Auf verbaute Ersatzteile gewähren wir 6 Monate Garantie gemäß unseren AGB.`,
};

// Combined text for intake documents / receipts
export const INTAKE_LEGAL_TEXT = `
${LEGAL_TEXTS.datenschutz}

${LEGAL_TEXTS.datensicherung}

${LEGAL_TEXTS.haftung}

${LEGAL_TEXTS.kva}

${LEGAL_TEXTS.abholung}

${LEGAL_TEXTS.agb}
`.trim();

// Short version for thermal receipts (80mm width)
export const THERMAL_LEGAL_TEXT = `
⚠️ ${LEGAL_TEXTS.datensicherung}

📋 ${LEGAL_TEXTS.haftung}

📖 ${LEGAL_TEXTS.agb}
`.trim();

// KVA document specific
export const KVA_LEGAL_TEXT = `
${LEGAL_TEXTS.kva}

${LEGAL_TEXTS.garantie}

${LEGAL_TEXTS.abholung}

${LEGAL_TEXTS.agb}
`.trim();

// Delivery note / pickup receipt
export const DELIVERY_LEGAL_TEXT = `
${LEGAL_TEXTS.garantie}

${LEGAL_TEXTS.agb}

Mit der Unterschrift bestätige ich den Empfang des reparierten Geräts.
`.trim();
