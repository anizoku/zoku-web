const authPaths = /^\/(login|register|signup|forgot-password|reset-password|profile-setup|auth\/callback)\/?$/i;
const hasUnsafeCharacters = (value) => value.includes('\\') || [...value].some((char) => char.charCodeAt(0) <= 32);

export function safeAuthReturnTo(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/';
  if (hasUnsafeCharacters(value)) return '/';
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith('//') || hasUnsafeCharacters(decoded)) return '/';
    const url = new URL(value, 'https://zoku.invalid');
    if (url.origin !== 'https://zoku.invalid' || authPaths.test(decodeURIComponent(url.pathname))) return '/';
    return url.pathname + url.search + url.hash;
  } catch { return '/'; }
}

export function authDestination(search) {
  return safeAuthReturnTo(new URLSearchParams(search).get('returnTo'));
}

export function authRoute(path, returnTo) {
  return `${path}?returnTo=${encodeURIComponent(safeAuthReturnTo(returnTo))}`;
}

export function emailCallbackUrl(origin, returnTo = '/') {
  return new URL(authRoute('/auth/callback', returnTo), origin).href;
}

export function setupValidation({ username, displayName, preferredLanguage }) {
  const name = username.trim();
  if (name.length < 3 || name.length > 24 || !/^[A-Za-z0-9](?:[A-Za-z0-9_]*[A-Za-z0-9])?$/.test(name) || name.includes('__')) {
    return 'Use de 3 a 24 letras, números ou underscores, sem underscores nas pontas ou repetidos.';
  }
  if (name.toLowerCase().includes('admin')) return 'Este nome de usuário é reservado.';
  if (!displayName.trim() || displayName.trim().length > 50) return 'Informe um nome de até 50 caracteres.';
  if (!['pt', 'en'].includes(preferredLanguage)) return 'Escolha seu idioma.';
  return null;
}

export function supabaseAuthMessage(error) {
  const messages = {
    invalid_credentials: 'E-mail ou senha incorretos.',
    email_not_confirmed: 'Confirme seu e-mail antes de entrar.',
    over_email_send_rate_limit: 'Aguarde um pouco antes de solicitar outro e-mail.',
    over_request_rate_limit: 'Muitas tentativas. Aguarde um pouco e tente novamente.',
    weak_password: 'Escolha uma senha mais forte, com pelo menos 8 caracteres.',
    same_password: 'A nova senha deve ser diferente da senha atual.',
    reauthentication_needed: 'Por segurança, solicite um novo link de recuperação e tente novamente.',
    reauthentication_not_valid: 'A confirmação de segurança expirou ou é inválida. Solicite um novo link de recuperação.',
    session_not_found: 'Sua sessão expirou. Solicite um novo link de recuperação.',
    session_expired: 'Sua sessão expirou. Solicite um novo link de recuperação.',
    refresh_token_not_found: 'Sua sessão expirou. Solicite um novo link de recuperação.',
    request_timeout: 'A conexão demorou demais. Verifique sua internet e tente novamente.',
    otp_expired: 'O link expirou ou já foi usado. Solicite um novo.',
    user_already_exists: 'Não foi possível criar a conta. Tente entrar ou recuperar sua senha.',
    USERNAME_TAKEN: 'Este nome de usuário já está em uso.',
    RESERVED_USERNAME: 'Este nome de usuário é reservado.',
  };
  if (error?.name === 'AuthRetryableFetchError') return 'Não foi possível conectar. Verifique sua internet e tente novamente.';
  return messages[error?.code] || messages[error?.message] || 'Não foi possível concluir. Tente novamente.';
}
