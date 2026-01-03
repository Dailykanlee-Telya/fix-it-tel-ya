/**
 * Get the base URL for the application.
 * Uses PUBLIC_APP_URL env var in production, falls back to window.location.origin.
 * NEVER returns lovable.app or preview-- URLs in production.
 */
export function getBaseUrl(): string {
  // Check for explicit production URL first
  const publicUrl = import.meta.env.VITE_PUBLIC_APP_URL || import.meta.env.PUBLIC_APP_URL;
  
  if (publicUrl) {
    return publicUrl.replace(/\/+$/, '');
  }
  
  // In browser, use current origin but filter out lovable/preview URLs
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    
    // If we're on a lovable preview, try to get the production URL
    if (origin.includes('lovable.app') || origin.includes('preview--')) {
      // Return empty to indicate we need proper configuration
      console.warn('Running on preview URL without PUBLIC_APP_URL configured');
      // Fall back to custom domain if known
      return 'https://telya.repariert.de';
    }
    
    return origin.replace(/\/+$/, '');
  }
  
  return '';
}

/**
 * Generate a tracking URL for a ticket
 */
export function generateTrackingUrl(ticketNumber: string, token: string): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/track?ticket=${encodeURIComponent(ticketNumber)}&token=${encodeURIComponent(token)}`;
}
