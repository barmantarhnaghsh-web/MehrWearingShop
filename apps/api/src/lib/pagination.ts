export interface PageParams {
  page: number;
  limit: number;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function pageMeta({ page, limit }: PageParams, total: number): PageMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export function pageSkip({ page, limit }: PageParams) {
  return (page - 1) * limit;
}

/** Clamp pagination input coming from untrusted query strings. */
export function normalizePagination(rawPage?: string, rawLimit?: string): PageParams {
  const parse = (raw: string | undefined, fallback: number, max: number) => {
    const n = Number.parseInt(raw ?? '', 10);
    return Number.isFinite(n) && n > 0 ? Math.min(n, max) : fallback;
  };
  return { page: parse(rawPage, 1, 10_000), limit: parse(rawLimit, 12, 50) };
}
