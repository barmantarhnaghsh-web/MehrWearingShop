import { guestCartId } from './utils';
import type { PageMeta } from './types';

/**
 * Browser API client for the MehrWearingShop REST API.
 * - Keeps access token in memory + localStorage, refreshes automatically
 * - Sends x-cart-id so anonymous carts survive reloads
 */

/**
 * Browser API base. Defaults to same-origin `/api/v1`, which Next rewrites
 * proxy to the API service (see next.config.mjs) — so the app works from any
 * hostname without CORS and without hard-coding localhost. Set
 * NEXT_PUBLIC_API_URL to an absolute URL to point at a separate API origin.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';
const LS_ACCESS = 'mwr.access';
const LS_REFRESH = 'mwr.refresh';
const LS_GUEST = 'mwr.guestCartId';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

let accessToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

export function setTokens(access: string | null, refresh: string | null) {
  accessToken = access;
  if (typeof window === 'undefined') return;
  if (access) localStorage.setItem(LS_ACCESS, access);
  else localStorage.removeItem(LS_ACCESS);
  if (refresh) localStorage.setItem(LS_REFRESH, refresh);
  else localStorage.removeItem(LS_REFRESH);
}

export function getStoredRefresh(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LS_REFRESH);
}

export function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  if (typeof window === 'undefined') return null;
  accessToken = localStorage.getItem(LS_ACCESS);
  return accessToken;
}

export function clearTokens() {
  setTokens(null, null);
}

/** Stable guest cart id for the current browser/device. */
export function getGuestCartId(): string {
  if (typeof window === 'undefined') return 'ssr';
  let id = localStorage.getItem(LS_GUEST);
  if (!id) {
    id = guestCartId();
    localStorage.setItem(LS_GUEST, id);
  }
  return id;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  auth?: boolean;
  retry?: boolean;
}

async function tryRefresh(): Promise<boolean> {
  const refresh = getStoredRefresh();
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { data: { accessToken: string; refreshToken: string } };
    setTokens(body.data.accessToken, body.data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = false, retry = true, headers, ...rest } = options;

  const send = async (): Promise<Response> => {
    const finalHeaders: Record<string, string> = {
      'x-cart-id': getGuestCartId(),
      ...(headers as Record<string, string> | undefined),
    };
    if (body !== undefined) finalHeaders['Content-Type'] = 'application/json';
    const token = getAccessToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;

    return fetch(`${API_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let res: Response;
  try {
    res = await send();
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the API server');
  }

  // Transparent token refresh on 401 (single flight).
  if (res.status === 401 && (auth || getAccessToken()) && retry) {
    refreshPromise ??= tryRefresh().finally(() => {
      refreshPromise = null;
    });
    const refreshed = await refreshPromise;
    if (refreshed) {
      res = await send();
    }
  }

  const text = await res.text();
  const parsed = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = parsed?.error;
    if (res.status === 401 && auth) clearTokens();
    throw new ApiError(res.status, err?.code ?? 'ERROR', err?.message ?? res.statusText, err?.details);
  }
  return parsed as T;
}

export interface ApiResponse<T> {
  data: T;
  meta?: PageMeta;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => apiRequest<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'PUT', body }),
  delete: <T>(path: string, options?: RequestOptions) => apiRequest<T>(path, { ...options, method: 'DELETE' }),
};

export { API_URL };
