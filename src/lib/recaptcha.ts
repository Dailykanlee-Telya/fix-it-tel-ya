/**
 * reCAPTCHA Configuration Helper
 * 
 * Reads the site key from environment and provides utilities for reCAPTCHA integration.
 */

/**
 * Get the reCAPTCHA site key from environment variables
 * Returns null if not configured
 */
export function getRecaptchaSiteKey(): string | null {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  return siteKey && siteKey.trim() !== '' ? siteKey : null;
}

/**
 * Check if reCAPTCHA is configured
 */
export function isRecaptchaConfigured(): boolean {
  return getRecaptchaSiteKey() !== null;
}

/**
 * German error messages for reCAPTCHA
 */
export const RECAPTCHA_ERRORS = {
  NOT_SOLVED: 'Bitte bestätigen Sie, dass Sie kein Roboter sind.',
  EXPIRED: 'Die Sicherheitsprüfung ist abgelaufen. Bitte versuchen Sie es erneut.',
  VERIFICATION_FAILED: 'Die Sicherheitsprüfung ist fehlgeschlagen. Bitte versuchen Sie es erneut.',
  NETWORK_ERROR: 'Ihre Anfrage konnte nicht verifiziert werden. Bitte prüfen Sie Ihre Internetverbindung.',
  STATUS_LOOKUP_FAILED: 'Die Statusabfrage konnte nicht verifiziert werden. Bitte laden Sie die Seite neu und versuchen Sie es erneut.',
} as const;
