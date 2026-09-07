/**
 * syncUtils.ts — Shared utilities for backend catalog sync functions.
 *
 * Used by:
 * - base44/functions/anilistCatalogSync/entry.ts
 * - base44/functions/malCatalogSync/entry.ts
 *
 * Pure helpers: sleep, retry-after parsing, chunking, run-id generation, cache.
 * No business logic, no sync rules — those live in syncFieldPolicy.ts.
 */

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parse HTTP Retry-After header (delta-seconds or HTTP-date) to milliseconds.
 */
export function parseRetryAfterMs(headerValue) {
  if (!headerValue) return null;
  const trimmed = headerValue.trim();
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10) * 1000;
  }
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return Math.max(date.getTime() - Date.now(), 1000);
  }
  return null;
}

export function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export function generateRunId(prefix = 'run') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Creates an in-memory TTL cache instance (per function invocation).
 * Returns { get, set } helpers bound to a private Map.
 */
export function createCache(ttlMs = 5 * 60 * 1000) {
  const cache = new Map();
  return {
    get(key) {
      const entry = cache.get(key);
      if (entry && entry.expires > Date.now()) return entry.data;
      if (entry) cache.delete(key);
      return null;
    },
    set(key, data) {
      cache.set(key, { data, expires: Date.now() + ttlMs });
    },
  };
}