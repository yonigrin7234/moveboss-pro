import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================================
// NAME FORMATTING UTILITIES
// Global name normalization for consistent display across the entire app.
// These functions should be used everywhere names are displayed or stored.
// ============================================================================

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

export function formatCurrency(value: number | null | undefined) {
  const num = typeof value === "number" ? value : 0
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(num)
}

/**
 * Normalizes a phone number to E.164 format for Supabase authentication.
 * Assumes US numbers (+1) if no country code is present.
 * 
 * @param phoneNumber - The phone number to normalize (can include formatting)
 * @returns The phone number in E.164 format (e.g., +13109759939)
 */
export function normalizePhoneToE164(phoneNumber: string): string {
  if (!phoneNumber) return phoneNumber;
  
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, "");
  
  // If it already starts with +, check if it's valid E.164
  if (phoneNumber.trim().startsWith("+")) {
    // If it has + followed by digits, return as is (assuming it's already E.164)
    const plusDigits = phoneNumber.replace(/[^\d+]/g, "");
    if (plusDigits.startsWith("+") && plusDigits.length > 1) {
      return plusDigits;
    }
  }
  
  // If it starts with 1 and has 11 digits, assume it's already US format
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  
  // If it has 10 digits, assume it's a US number and add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // For other lengths, try to add +1 for US numbers (fallback)
  if (digits.length > 0) {
    return `+1${digits}`;
  }
  
  return phoneNumber;
}
