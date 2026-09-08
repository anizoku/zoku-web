import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useSiteConfig } from '@/hooks/useSiteConfig';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

const UserNotRegisteredError = () => {
  const { logout } = useAuth();
  const { logo_full_url } = useSiteConfig();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center">
        <img src={logo_full_url} alt="Zoku" className="h-9 w-auto mx-auto mb-6" />
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-destructive/10 mb-4">
          <AlertCircle className="w-7 h-7 text-destructive" />
        </div>
        <h1 className="font-space font-bold text-2xl text-foreground mb-2">
          Não foi possível concluir seu acesso.
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          Ocorreu um problema ao verificar sua conta. Tente novamente ou entre com outra conta.
        </p>
        <div className="flex flex-col gap-2">
          <Button onClick={() => window.location.reload()} className="w-full h-11">
            Tentar novamente
          </Button>
          <Button variant="outline" onClick={() => logout(true, '/login')} className="w-full h-11">
            Sair
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;