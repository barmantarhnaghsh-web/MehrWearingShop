import { describe, expect, it } from 'vitest';
import { normalizePagination, pageMeta } from '../lib/pagination';

describe('normalizePagination', () => {
  it('defaults to page 1 / limit 12', () => {
    expect(normalizePagination(undefined, undefined)).toEqual({ page: 1, limit: 12 });
  });
  it('clamps limit to 50', () => {
    expect(normalizePagination('3', '999')).toEqual({ page: 3, limit: 50 });
  });
  it('falls back on garbage input', () => {
    expect(normalizePagination('abc', '-5')).toEqual({ page: 1, limit: 12 });
  });
});

describe('pageMeta', () => {
  it('computes total pages and flags', () => {
    const meta = pageMeta({ page: 2, limit: 10 }, 35);
    expect(meta).toEqual({ page: 2, limit: 10, total: 35, totalPages: 4, hasNext: true, hasPrev: true });
  });
  it('handles empty result sets', () => {
    expect(pageMeta({ page: 1, limit: 10 }, 0).totalPages).toBe(1);
  });
});
