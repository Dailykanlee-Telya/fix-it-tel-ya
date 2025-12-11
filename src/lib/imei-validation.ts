/**
 * IMEI Validation Utility
 * Validates IMEI numbers using the Luhn algorithm
 */

/**
 * Validates an IMEI number
 * @param imei - The IMEI string to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateIMEI(imei: string): { isValid: boolean; error?: string } {
  // Remove any spaces or dashes
  const cleanIMEI = imei.replace(/[\s-]/g, '');

  // Check if empty (IMEI is optional)
  if (!cleanIMEI) {
    return { isValid: true };
  }

  // Check length (must be exactly 15 digits)
  if (cleanIMEI.length !== 15) {
    return { 
      isValid: false, 
      error: 'IMEI muss genau 15 Zeichen haben' 
    };
  }

  // Check if all characters are digits
  if (!/^\d+$/.test(cleanIMEI)) {
    return { 
      isValid: false, 
      error: 'IMEI darf nur Ziffern enthalten' 
    };
  }

  // Validate using Luhn algorithm
  if (!luhnCheck(cleanIMEI)) {
    return { 
      isValid: false, 
      error: 'Ungültige IMEI-Prüfsumme' 
    };
  }

  return { isValid: true };
}

/**
 * Luhn algorithm check
 * @param digits - String of digits to validate
 * @returns true if valid according to Luhn algorithm
 */
function luhnCheck(digits: string): boolean {
  let sum = 0;
  let isEven = false;

  // Loop through digits from right to left
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Format IMEI for display (adds dashes for readability)
 * @param imei - Raw IMEI string
 * @returns Formatted IMEI like "123456-78-901234-5"
 */
export function formatIMEI(imei: string): string {
  const clean = imei.replace(/[\s-]/g, '');
  if (clean.length !== 15) return imei;
  return `${clean.slice(0, 6)}-${clean.slice(6, 8)}-${clean.slice(8, 14)}-${clean.slice(14)}`;
}
