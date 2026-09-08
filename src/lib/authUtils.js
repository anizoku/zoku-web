/**
 * Retorna um path same-origin seguro do parâmetro returnTo ou from_url.
 * Rejeita URLs externas (open redirect prevention).
 */
export function getSafeReturnTo() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get("returnTo") || params.get("from_url");
  if (!returnTo) return null;
  // Aceitar apenas paths same-origin (começa com / e não é //)
  if (returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return null;
}

/**
 * Extrai o resetToken da URL (reset password flow).
 */
export function getResetToken() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("resetToken") || params.get("token");
}

/**
 * Salva o returnTo no sessionStorage para recuperar após OAuth redirect.
 */
export function saveReturnToForOAuth() {
  const returnTo = getSafeReturnTo();
  if (returnTo) {
    sessionStorage.setItem("auth_returnTo", returnTo);
  }
}

/**
 * Recupera e limpa o returnTo salvo do sessionStorage.
 */
export function consumeSavedReturnTo() {
  const saved = sessionStorage.getItem("auth_returnTo");
  if (saved) {
    sessionStorage.removeItem("auth_returnTo");
    return saved;
  }
  return null;
}