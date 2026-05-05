import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import CatalogManager from "@/components/admin/CatalogManager";

export default function Admin() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me()
      .then((u) => {
        setUser(u);
        if (u.role !== "admin") {
          navigate("/");
        }
      })
      .catch(() => navigate("/"))
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <span className="text-sm text-muted-foreground font-medium">Carregando...</span>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
      <Button variant="ghost" size="sm" className="mb-4 gap-2 text-muted-foreground hover:text-foreground -ml-2"
        onClick={() => navigate(-1)}>
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Button>

      <div className="space-y-6">
        <div>
          <h1 className="font-space font-bold text-3xl text-foreground">Painel Admin</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie o catálogo, adicione/edite/remova obras</p>
        </div>

        <CatalogManager />
      </div>
    </div>
  );
}