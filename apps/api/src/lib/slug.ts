/**
 * Build a URL slug. Persian/Arabic characters are stripped; if nothing ASCII
 * remains we fall back to a short random suffix so slugs are always unique-ish.
 */
export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (base.length >= 2) return base;
  return `item-${Math.random().toString(36).slice(2, 8)}`;
}

/** Human friendly order reference, e.g. MWR-8F3K2Q. */
export function orderNumber(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `MWR-${out}`;
}
