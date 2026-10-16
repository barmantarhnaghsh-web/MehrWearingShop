import { describe, expect, it } from 'vitest';
import { orderNumber, slugify } from '../lib/slug';

describe('slugify', () => {
  it('lowercases and joins words', () => {
    expect(slugify('Galaxy S24 Ultra')).toBe('galaxy-s24-ultra');
  });
  it('strips punctuation', () => {
    expect(slugify('iPhone 15 Pro (256GB)!')).toBe('iphone-15-pro-256gb');
  });
  it('falls back for pure Persian names', () => {
    expect(slugify('گوشی موبایل')).toMatch(/^item-[a-z0-9]{6}$/);
  });
});

describe('orderNumber', () => {
  it('generates MWR-XXXXXX refs with unambiguous characters', () => {
    const n = orderNumber();
    expect(n).toMatch(/^MWR-[A-Z2-9]{6}$/);
    expect(n).not.toContain('O');
    expect(n).not.toContain('I');
  });
});
