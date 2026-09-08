import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { mapAuthError } from "@/lib/authErrors";

export function ForgotForm({ onSwitchMode }) {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      const msg = mapAuthError(err);
      if (msg) setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div>
        <h1 className="font-space font-bold text-2xl text-foreground mb-1">Verifique seu e-mail</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Se uma conta existir com <strong className="text-foreground">{email}</strong>, você receberá um link para redefinir sua senha.
        </p>
        <button
          type="button"
          onClick={() => onSwitchMode("login")}
          className="text-sm text-primary font-medium hover:underline"
        >
          Voltar ao login
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-space font-bold text-2xl text-foreground mb-1">Recuperar senha</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Digite seu e-mail para receber as instruções de recuperação.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3" role="alert" aria-live="assertive">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="forgot-email" className="text-sm font-medium text-foreground mb-1.5 block">E-mail</label>
          <Input
            id="forgot-email"
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
        <Button type="submit" disabled={loading} className="w-full h-11 text-base font-semibold">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : "Enviar link"}
        </Button>
      </form>
      <button
        type="button"
        onClick={() => onSwitchMode("login")}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-3"
      >
        Voltar ao login
      </button>
    </div>
  );
}