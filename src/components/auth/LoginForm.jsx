import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "./PasswordInput";
import { OAuthButtons } from "./OAuthButtons";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { mapAuthError } from "@/lib/authErrors";
import { getSafeReturnTo, saveReturnToForOAuth } from "@/lib/authUtils";

export function LoginForm({ onSwitchMode }) {
  const { signInWithEmail, signInWithGoogle, signInWithApple } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      const returnTo = getSafeReturnTo();
      window.location.href = returnTo || "/";
    } catch (err) {
      const msg = mapAuthError(err);
      if (msg) setError(msg);
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

  return (
    <div>
      <h1 className="font-space font-bold text-2xl text-foreground mb-1">Entrar</h1>
      <p className="text-muted-foreground text-sm mb-6">Bem-vindo de volta ao Zoku.</p>

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
          <label htmlFor="login-email" className="text-sm font-medium text-foreground mb-1.5 block">E-mail</label>
          <Input
            id="login-email"
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
          <label htmlFor="login-password" className="text-sm font-medium text-foreground mb-1.5 block">Senha</label>
          <PasswordInput
            id="login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Sua senha"
            autoComplete="current-password"
            required
            disabled={loading}
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full h-11 text-base font-semibold">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</> : "Entrar"}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => onSwitchMode("forgot")}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-3"
      >
        Esqueceu a senha?
      </button>

      <p className="text-sm text-muted-foreground mt-6 text-center">
        Não tem conta?{" "}
        <button type="button" onClick={() => onSwitchMode("signup")} className="text-primary font-medium hover:underline">
          Criar conta
        </button>
      </p>
    </div>
  );
}