/**
 * Smart name splitting utility for German customer names.
 * 
 * Rules:
 * - 1 word: first_name = word, last_name = ''
 * - 2 words: first_name = first word, last_name = second word
 * - 3+ words: last_name = last word, first_name = all previous words
 * 
 * @example
 * splitName("Ali") => { first_name: "Ali", last_name: "" }
 * splitName("Ali Yilmaz") => { first_name: "Ali", last_name: "Yilmaz" }
 * splitName("Ali Can Yilmaz") => { first_name: "Ali Can", last_name: "Yilmaz" }
 */
export function splitName(fullName: string): { first_name: string; last_name: string } {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { first_name: '', last_name: '' };
  }

  // Split by whitespace and filter out empty strings
  const parts = trimmed.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { first_name: '', last_name: '' };
  }

  if (parts.length === 1) {
    return { first_name: parts[0], last_name: '' };
  }

  if (parts.length === 2) {
    return { first_name: parts[0], last_name: parts[1] };
  }

  // 3+ words: last word is last_name, rest is first_name
  const last_name = parts[parts.length - 1];
  const first_name = parts.slice(0, -1).join(' ');

  return { first_name, last_name };
}

/**
 * Combines first and last name into a full name string
 */
export function combineName(first_name: string, last_name: string): string {
  return [first_name, last_name].filter(Boolean).join(' ').trim();
}
