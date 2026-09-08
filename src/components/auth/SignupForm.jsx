import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "./PasswordInput";
import { OAuthButtons } from "./OAuthButtons";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { mapAuthError } from "@/lib/authErrors";
import { getSafeReturnTo, saveReturnToForOAuth } from "@/lib/authUtils";

export function SignupForm({ onSwitchMode }) {
  const { signUpWithEmail, verifyEmailOtp, updateMe, signInWithGoogle, signInWithApple } = useAuth();
  const [step, setStep] = useState("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function validatePasswords() {
    if (password !== confirmPassword) return "As senhas não coincidem.";
    if (password.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setError("");
    const pwError = validatePasswords();
    if (pwError) {
      setError(pwError);
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmail(email, password);
      setStep("otp");
    } catch (err) {
      const msg = mapAuthError(err);
      if (msg) setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      await verifyEmailOtp(email, otpCode);
      if (name) {
        try { await updateMe({ full_name: name }); } catch {}
      }
      const returnTo = getSafeReturnTo();
      window.location.href = returnTo || "/";
    } catch (err) {
      const msg = mapAuthError(err);
      if (msg) setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    saveReturnToForOAuth();
    await signInWithGoogle();
  }

  async function handleApple() {
    saveReturnToForOAuth();
    await signInWithApple();
  }

  if (step === "otp") {
    return (
      <div>
        <h1 className="font-space font-bold text-2xl text-foreground mb-1">Verifique seu e-mail</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Enviamos um código de verificação para <strong className="text-foreground">{email}</strong>.
        </p>
        <form onSubmit={handleOtpSubmit} className="space-y-3">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3" role="alert" aria-live="assertive">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="signup-otp" className="text-sm font-medium text-foreground mb-1.5 block">Código de verificação</label>
            <Input
              id="signup-otp"
              type="text"
              inputMode="numeric"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              autoComplete="one-time-code"
              required
              disabled={loading}
              className="bg-secondary border-none text-center text-lg tracking-widest"
              maxLength={6}
            />
          </div>
          <Button type="submit" disabled={loading || otpCode.length < 4} className="w-full h-11 text-base font-semibold">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</> : "Verificar e entrar"}
          </Button>
        </form>
        <button
          type="button"
          onClick={() => { setStep("form"); setError(""); }}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-3"
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-space font-bold text-2xl text-foreground mb-1">Criar conta</h1>
      <p className="text-muted-foreground text-sm mb-6">Comece sua jornada anime no Zoku.</p>

      <OAuthButtons onGoogle={handleGoogle} onApple={handleApple} disabled={loading} />

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">ou</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3" role="alert" aria-live="assertive">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="signup-name" className="text-sm font-medium text-foreground mb-1.5 block">Nome</label>
          <Input
            id="signup-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            autoComplete="name"
            required
            disabled={loading}
            className="bg-secondary border-none"
          />
        </div>
        <div>
          <label htmlFor="signup-email" className="text-sm font-medium text-foreground mb-1.5 block">E-mail</label>
          <Input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            autoComplete="email"
            required
            disabled={loading}
            className="bg-secondary border-none"
          />
        </div>
        <div>
          <label htmlFor="signup-password" className="text-sm font-medium text-foreground mb-1.5 block">Senha</label>
          <PasswordInput
            id="signup-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            required
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="signup-confirm" className="text-sm font-medium text-foreground mb-1.5 block">Confirmar senha</label>
          <PasswordInput
            id="signup-confirm"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repita a senha"
            autoComplete="new-password"
            required
            disabled={loading}
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full h-11 text-base font-semibold">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando conta...</> : "Criar conta"}
        </Button>
      </form>

      <p className="text-[11px] text-muted-foreground mt-3 text-center">
        Ao criar uma conta, você concorda com os Termos de Uso e a Política de Privacidade.
      </p>

      <p className="text-sm text-muted-foreground mt-4 text-center">
        Já tem conta?{" "}
        <button type="button" onClick={() => onSwitchMode("login")} className="text-primary font-medium hover:underline">
          Entrar
        </button>
      </p>
    </div>
  );
}