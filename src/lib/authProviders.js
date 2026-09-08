/**
 * authProviders.js — Central toggle for OAuth providers in the Zoku auth UI.
 *
 * To re-enable Apple, set apple: true. No other code changes needed.
 *
 * APPLE_LOGIN = TEMPORARILY_DISABLED_UI
 * Motivo: configuração externa Apple Developer ainda não concluída.
 */

export const AUTH_PROVIDERS = {
  google: true,
  apple: false, // TEMPORARILY_DISABLED_UI
};

export const isAuthProviderEnabled = (provider) => Boolean(AUTH_PROVIDERS[provider]);