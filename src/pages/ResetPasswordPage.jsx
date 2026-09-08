import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { mapAuthError } from "@/lib/authErrors";
import { getResetToken } from "@/lib/authUtils";
import { useSiteConfig } from "@/hooks/useSiteConfig";

/**
 * Página de reset de senha — acessada via link enviado por e-mail.
 * O resetToken vem como query param na URL.
 */
export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const { logo_full_url } = useSiteConfig();
  const navigate = useNavigate();
  const resetToken = getResetToken();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!resetToken) {
    return <Navigate to="/login" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setError("");
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(resetToken, password);
      setSuccess(true);
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-[430px] text-center">
          <img src={logo_full_url} alt="Zoku" className="h-9 w-auto mx-auto mb-6" />
          <h1 className="font-space font-bold text-2xl text-foreground mb-2">Senha atualizada</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Sua senha foi redefinida com sucesso. Você já pode entrar com a nova senha.
          </p>
          <Button onClick={() => navigate("/login")} className="w-full h-11">
            Ir para o login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-[430px]">
        <div className="mb-8 flex justify-center">
          <img src={logo_full_url} alt="Zoku" className="h-9 w-auto" />
        </div>
        <h1 className="font-space font-bold text-2xl text-foreground mb-1">Redefinir senha</h1>
        <p className="text-muted-foreground text-sm mb-6">Digite sua nova senha.</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3" role="alert" aria-live="assertive">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="reset-password" className="text-sm font-medium text-foreground mb-1.5 block">Nova senha</label>
            <PasswordInput
              id="reset-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              required
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="reset-confirm" className="text-sm font-medium text-foreground mb-1.5 block">Confirmar senha</label>
            <PasswordInput
              id="reset-confirm"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a senha"
              autoComplete="new-password"
              required
              disabled={loading}
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full h-11 text-base font-semibold">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Atualizando...</> : "Atualizar senha"}
          </Button>
        </form>
      </div>
    </div>
  );
}