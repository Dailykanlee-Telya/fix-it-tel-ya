// Zentrale Logo-Konfiguration für alle Dokumente
// Single Source of Truth für Logo-Assets

// Logo-Pfade - zentral verwaltet
export const DOCUMENT_LOGOS = {
  // A4-Dokumente: Vollständiges Logo mit Text
  a4: '/telya-logo.png',
  
  // Bondruck: Gleiches Logo, aber mit anderem Sizing
  thermal: '/telya-logo.png',
} as const;

// Logo-Dimensionen
export const LOGO_DIMENSIONS = {
  // A4-Dokumente: Feste maximale Höhe
  a4: {
    maxHeight: '14mm',
    maxWidth: 'auto',
  },
  
  // Bondruck: Feste maximale Breite (für 80mm Papier)
  thermal: {
    maxHeight: 'auto',
    maxWidth: '30mm',
  },
} as const;

// Logo als Base64 für PDF-Einbettung (wird beim ersten Laden gecached)
let logoBase64Cache: string | null = null;

export async function getLogoBase64(logoPath: string = DOCUMENT_LOGOS.a4): Promise<string> {
  if (logoBase64Cache) {
    return logoBase64Cache;
  }
  
  try {
    const response = await fetch(logoPath);
    if (!response.ok) {
      console.warn('Logo konnte nicht geladen werden:', logoPath);
      return '';
    }
    
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        logoBase64Cache = reader.result as string;
        resolve(logoBase64Cache);
      };
      reader.onerror = () => {
        console.warn('Logo Base64-Konvertierung fehlgeschlagen');
        resolve('');
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('Fehler beim Laden des Logos:', error);
    return '';
  }
}

// CSS für Logo-Einbindung in PDF
export const LOGO_CSS = {
  a4: `
    .pdf-logo-container {
      display: flex;
      align-items: center;
      gap: 3mm;
    }
    
    .pdf-logo {
      height: 14mm;
      max-height: 14mm;
      width: auto;
      object-fit: contain;
    }
  `,
  
  thermal: `
    .bon-logo-container {
      text-align: center;
      margin-bottom: 2mm;
    }
    
    .bon-logo {
      max-width: 30mm;
      height: auto;
      object-fit: contain;
    }
  `,
} as const;
