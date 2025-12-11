/**
 * NAME FORMATTING UTILITIES
 * Global name normalization for consistent display across the entire app.
 * These functions should be used everywhere names are displayed or stored.
 *
 * NOTE: Keep in sync with apps/web/src/lib/utils.ts
 */

/**
 * Title-cases a string properly, handling edge cases.
 * - Converts "JOHN DOE" to "John Doe"
 * - Converts "john doe" to "John Doe"
 * - Converts "jOhN dOe" to "John Doe"
 * - Preserves intentional capitalizations like "McDonald", "O'Brien"
 * - Handles hyphenated names like "Mary-Jane" -> "Mary-Jane"
 */
export function formatName(name: string | null | undefined): string {
  if (!name || typeof name !== 'string') return '';

  const trimmed = name.trim();
  if (!trimmed) return '';

  // Handle special prefixes that should preserve following capital
  const specialPrefixes = ['mc', 'mac', "o'"];

  return trimmed
    .toLowerCase()
    .split(/(\s+)/) // Split by whitespace, keeping separators
    .map(part => {
      if (!part.trim()) return part; // Preserve whitespace

      // Handle hyphenated parts
      if (part.includes('-')) {
        return part.split('-').map(subpart => capitalizeWord(subpart, specialPrefixes)).join('-');
      }

      return capitalizeWord(part, specialPrefixes);
    })
    .join('');
}

/**
 * Capitalizes a single word, handling special prefixes.
 */
function capitalizeWord(word: string, specialPrefixes: string[]): string {
  if (!word) return word;

  const lower = word.toLowerCase();

  // Check for special prefixes like "mc", "mac", "o'"
  for (const prefix of specialPrefixes) {
    if (lower.startsWith(prefix) && lower.length > prefix.length) {
      return (
        prefix.charAt(0).toUpperCase() +
        prefix.slice(1) +
        lower.charAt(prefix.length).toUpperCase() +
        lower.slice(prefix.length + 1)
      );
    }
  }

  // Standard capitalization
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Formats a full name from first and last name parts.
 * Both parts are normalized using formatName().
 */
export function formatFullName(
  firstName: string | null | undefined,
  lastName: string | null | undefined
): string {
  const first = formatName(firstName);
  const last = formatName(lastName);

  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (last) return last;
  return '';
}

/**
 * Formats a company name with proper title-casing.
 * Handles common suffixes like LLC, Inc, Corp properly.
 */
export function formatCompanyName(name: string | null | undefined): string {
  if (!name || typeof name !== 'string') return '';

  const trimmed = name.trim();
  if (!trimmed) return '';

  // Suffixes that should remain uppercase
  const uppercaseSuffixes = ['LLC', 'INC', 'CORP', 'LTD', 'LP', 'LLP', 'PC', 'PA', 'PLLC', 'CO', 'DBA'];

  const words = trimmed.split(/(\s+)/);

  return words.map(word => {
    if (!word.trim()) return word;

    const upper = word.toUpperCase().replace(/[.,]/g, ''); // Remove punctuation for comparison

    // Keep suffixes uppercase
    if (uppercaseSuffixes.includes(upper)) {
      return word.toUpperCase();
    }

    // Apply standard name formatting
    return formatName(word);
  }).join('');
}

/**
 * Generates initials from a name (up to 2 characters).
 */
export function getInitials(
  firstNameOrFullName: string | null | undefined,
  lastName?: string | null | undefined
): string {
  if (lastName !== undefined) {
    // Two-argument form: firstName, lastName
    const first = formatName(firstNameOrFullName);
    const last = formatName(lastName);
    const initials = `${first.charAt(0)}${last.charAt(0)}`;
    return initials.toUpperCase();
  }

  // Single-argument form: full name
  const name = formatName(firstNameOrFullName);
  if (!name) return '';

  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();

  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

/**
 * Creates a display string combining person name and company name.
 * Used in messaging and other contexts where both should be shown.
 */
export function formatSenderDisplay(
  personName: string | null | undefined,
  companyName: string | null | undefined
): string {
  const person = formatName(personName);
  const company = formatCompanyName(companyName);

  if (person && company) return `${person} • ${company}`;
  if (person) return person;
  if (company) return company;
  return 'Unknown';
}
