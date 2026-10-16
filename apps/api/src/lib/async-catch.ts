import express from 'express';

/**
 * Express 4 does not forward rejected promises from async handlers to the
 * error pipeline (Express 5 does). This patch wraps every handler registered
 * on a router so a thrown/rejected ApiError reaches errorHandler instead of
 * hanging the request.
 *
 * Imported once at startup (app.ts) — no per-route boilerplate needed.
 */
type Fn = (...args: unknown[]) => unknown;

function wrap(fn: Fn): Fn {
  if (fn.length === 4) return fn; // keep error-handling middleware untouched
  return function patched(this: unknown, ...args: unknown[]) {
    try {
      const result = fn.apply(this, args);
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        return (result as Promise<unknown>).catch((err) => {
          const next = args[2] as (e: unknown) => void;
          next(err);
        });
      }
      return result;
    } catch (err) {
      const next = args[2] as (e: unknown) => void;
      next(err);
      return undefined;
    }
  };
}

function wrapArgs(args: unknown[]): unknown[] {
  return args.map((a) => (typeof a === 'function' ? wrap(a as Fn) : a));
}

const prototype = Object.getPrototypeOf(express.Router()) as Record<string, (...a: unknown[]) => unknown>;

for (const method of ['get', 'post', 'put', 'patch', 'delete', 'all', 'use']) {
  const original = prototype[method];
  if (!original || (original as { __asyncWrapped?: boolean }).__asyncWrapped) continue;
  const patched = function patched(this: unknown, ...args: unknown[]) {
    return original.apply(this, wrapArgs(args));
  };
  patched.__asyncWrapped = true;
  prototype[method] = patched;
}

export {};
