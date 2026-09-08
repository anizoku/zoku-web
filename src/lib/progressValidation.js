/**
 * progressValidation.js — Shared validation for AnimeEntry progress operations.
 * Used by ObraProfile and MyList to ensure consistent, safe behavior.
 */

/**
 * Validates and normalizes a progress value.
 * @param {*} value - The input value
 * @param {number|null} total - Known total (null/0 = unknown)
 * @returns {{ valid: boolean, value: number, error?: string }}
 */
export function validateProgress(value, total) {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return { valid: false, value: 0, error: "Valor deve ser um número inteiro." };
  }
  if (n < 0) {
    return { valid: false, value: 0, error: "Valor não pode ser negativo." };
  }
  if (total != null && total > 0 && n > total) {
    return { valid: false, value: total, error: `Máximo: ${total}.` };
  }
  return { valid: true, value: n };
}

/**
 * Computes the XP-eligible delta for a progress change.
 * Returns 0 for no progress or regression (no XP on downgrade).
 */
export function computeXpDelta(prevValue, newValue, xpPerUnit) {
  const diff = Math.max(0, newValue - prevValue);
  return diff * xpPerUnit;
}

/**
 * Determines if reaching the total should auto-complete.
 * Returns false for airing works (total may grow) and when total is unknown.
 */
export function shouldAutoComplete(newValue, total, isAiring) {
  if (!total || total <= 0) return false;
  if (isAiring) return false;
  return newValue >= total;
}