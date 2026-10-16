import { cache } from 'react';
import type { ApiResponse } from './api';

const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';
const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:4000';
/**
 * Absolute base for server-side fetches. The default public base is
 * same-origin (`/api/v1`, proxied by Next rewrites for the browser), but
 * Node's fetch needs a full URL — and must talk to the API directly, since
 * rewrites don't exist during `next build` prerendering.
 */
const API_URL = PUBLIC_API_URL.startsWith('/')
  ? `${API_PROXY_TARGET}${PUBLIC_API_URL}`
  : PUBLIC_API_URL;

/**
 * Server-side fetch helper (RSC / route handlers).
 * Never throws on API errors — pages decide how to degrade.
 */
export async function serverFetch<T>(path: string, revalidate = 0): Promise<ApiResponse<T> | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { accept: 'application/json' },
      ...(revalidate > 0 ? { next: { revalidate } } : { cache: 'no-store' }),
    });
    if (!res.ok) return null;
    return (await res.json()) as ApiResponse<T>;
  } catch {
    return null;
  }
}

/** Memoized per-request catalog reads (React cache dedupes RSC calls). */
export const getProducts = cache((query: string) => serverFetch<unknown[]>(`/products${query}`));
export const getProduct = cache((slug: string) => serverFetch<unknown>(`/products/${slug}`));
export const getCategories = cache(() => serverFetch<unknown[]>('/categories', 300));

export { API_URL };
