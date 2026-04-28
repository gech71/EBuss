import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalizes an email address by:
 * 1. Converting to lowercase
 * 2. Stripping sub-addressing (e.g., user+extra@gmail.com -> user@gmail.com)
 */
export function normalizeEmail(email: string): string {
  const [localPart, domain] = email.trim().toLowerCase().split('@');
  if (!domain) return email.toLowerCase();
  
  // Strip sub-addressing
  const baseLocalPart = localPart.split('+')[0];
  
  return `${baseLocalPart}@${domain}`;
}
