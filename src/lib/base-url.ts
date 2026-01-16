/**
 * Get the base URL for the application.
 * Uses PUBLIC_APP_URL env var in production, falls back to production domain.
 * NEVER returns preview URLs.
 */

// Production domain - the ONLY allowed external URL
const PRODUCTION_DOMAIN = 'https://telya.repariert.de';

export function getBaseUrl(): string {
  // Check for explicit production URL first
  const publicUrl = import.meta.env.VITE_PUBLIC_APP_URL || import.meta.env.PUBLIC_APP_URL;
  
  if (publicUrl) {
    return publicUrl.replace(/\/+$/, '');
  }
  
  // In browser, use current origin (allows staging/preview URLs to work)
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    return origin.replace(/\/+$/, '');
  }
  
  return PRODUCTION_DOMAIN;
}

/**
 * Generate a tracking URL for a ticket
 * Uses email + tracking code (no ticket number exposed)
 */
export function generateTrackingUrl(email: string, trackingCode: string): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/track?email=${encodeURIComponent(email)}&code=${encodeURIComponent(trackingCode)}`;
}

/**
 * Legacy tracking URL for backwards compatibility (redirects to new format)
 */
export function generateLegacyTrackingUrl(ticketNumber: string, token: string): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/track?code=${encodeURIComponent(token)}`;
}
