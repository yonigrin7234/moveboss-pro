import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
