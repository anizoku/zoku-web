import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { AuthHero } from "@/components/auth/AuthHero";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";
import { ForgotForm } from "@/components/auth/ForgotForm";
import { getSafeReturnTo } from "@/lib/authUtils";

/**
 * Página de autenticação do Zoku — split-screen no desktop (hero + painel)
 * e hero fullscreen com overlay no mobile. 3 modos: login, signup, forgot.
 */
export default function AuthPage({ mode: initialMode = "login" }) {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const { logo_full_url } = useSiteConfig();
  const [authMode, setAuthMode] = useState(initialMode);

  // Usuário já autenticado → redirecionar
  if (!isLoadingAuth && isAuthenticated) {
    const returnTo = getSafeReturnTo();
    return <Navigate to={returnTo || "/"} replace />;
  }

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,1.7fr)_minmax(420px,560px)]">
      {/* Hero: background fixo no mobile, coluna estática no desktop */}
      <div className="fixed inset-0 lg:static lg:min-h-screen">
        <AuthHero />
      </div>

      {/* Painel: foreground no mobile, coluna direita no desktop */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-background/90 lg:bg-background backdrop-blur-sm lg:backdrop-blur-none">
        <div className="w-full max-w-[430px] py-8">
          {/* Logo */}
          <div className="mb-8 flex justify-center lg:justify-start">
            <img src={logo_full_url} alt="Zoku" className="h-9 w-auto" />
          </div>

          {authMode === "login" && <LoginForm onSwitchMode={setAuthMode} />}
          {authMode === "signup" && <SignupForm onSwitchMode={setAuthMode} />}
          {authMode === "forgot" && <ForgotForm onSwitchMode={setAuthMode} />}
        </div>
      </div>
    </div>
  );
}