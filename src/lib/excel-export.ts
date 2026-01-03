/**
 * Export data to CSV file
 * @param data Array of objects to export
 * @param filename Name for the downloaded file (without extension)
 * @param columns Column definitions with key (field name) and label (header)
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns: { key: keyof T; label: string }[]
): void {
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Create CSV header
  const header = columns.map(col => `"${col.label}"`).join(';');

  // Create CSV rows
  const rows = data.map(row => 
    columns.map(col => {
      const value = row[col.key];
      if (value === null || value === undefined) return '""';
      if (typeof value === 'number') return value.toString().replace('.', ',');
      if (typeof value === 'boolean') return value ? 'Ja' : 'Nein';
      if (value && typeof value === 'object' && 'toLocaleDateString' in value) {
        return `"${(value as Date).toLocaleDateString('de-DE')}"`;
      }
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(';')
  );

  // Combine header and rows
  const csvContent = '\uFEFF' + [header, ...rows].join('\n'); // BOM for Excel UTF-8

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format date for reports
 */
export function formatReportDate(date: Date): string {
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format currency for reports
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0,00 €';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

/**
 * Format duration in minutes to human readable
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} Min.`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours < 24) return `${hours}h ${mins}m`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h`;
}
