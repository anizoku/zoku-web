/**
 * Mapeia erros da API Base44 Auth para mensagens amigáveis em PT-BR.
 * Retorna null para erros que não devem ser exibidos (ex: OAuth cancelado).
 */
export function mapAuthError(error) {
  if (!error) return "Ocorreu um erro. Tente novamente.";

  const msg = (error.message || "").toLowerCase();
  const status = error.status;

  if (msg.includes("cancelled") || msg.includes("canceled")) {
    return null;
  }
  if (status === 401 || msg.includes("invalid credentials") || msg.includes("unauthorized")) {
    return "E-mail ou senha incorretos.";
  }
  if (status === 409 || msg.includes("already exists") || msg.includes("already registered") || msg.includes("email already") || msg.includes("already in use")) {
    return "Já existe uma conta com este e-mail.";
  }
  if (msg.includes("weak password") || msg.includes("password too weak") || msg.includes("password too short")) {
    return "A senha é muito fraca. Use pelo menos 8 caracteres.";
  }
  if (msg.includes("network") || msg.includes("failed to fetch") || msg.includes("network error") || msg.includes("err_network")) {
    return "Não foi possível conectar. Tente novamente.";
  }
  if (msg.includes("invalid otp") || msg.includes("invalid code") || msg.includes("verification code") || msg.includes("otp")) {
    return "Código de verificação inválido.";
  }
  if (msg.includes("expired")) {
    return "O link ou código expirou. Solicite um novo.";
  }
  if (msg.includes("not found") || msg.includes("no user")) {
    return "E-mail ou senha incorretos.";
  }
  return error.message || "Ocorreu um erro. Tente novamente.";
}