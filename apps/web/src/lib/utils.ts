import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Stable client-side id used for guest carts (crypto.randomUUID with fallback). */
export function guestCartId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `guest-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}
