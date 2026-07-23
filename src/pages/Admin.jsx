import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CatalogManager from "@/components/admin/CatalogManager";
import CategoryManager from "@/components/admin/CategoryManager";
import CatalogSync from "@/components/admin/CatalogSync";
import DynamicCatalogPanel from "@/components/admin/DynamicCatalogPanel";
import SuggestionsPanel from "@/components/admin/SuggestionsPanel";
import ModerationPanel from "@/components/admin/ModerationPanel";
import MigrateEntriesPanel from "@/components/admin/MigrateEntriesPanel";
import AppearanceManager from "@/components/admin/AppearanceManager";
import FranchiseMerger from "@/components/admin/FranchiseMerger";
import NewsManager from "@/components/news/NewsManager";
import LoginImagesPanel from "@/components/admin/LoginImagesPanel";
import BannersPanel from "@/components/admin/BannersPanel";

export default function Admin() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me()
      .then((u) => {
        setUser(u);
        if (u.role !== "admin") navigate("/");
      })
      .catch(() => navigate("/"))
      .finally(() => setLoading(false));
  }, [navigate]);

  // Hook must be called unconditionally — enabled flag controls execution
  const { data: pendingSuggestions = [] } = useQuery({
    queryKey: ["pending-suggestions-count"],
    queryFn: () => base44.entities.WorkSuggestion.list("-created_at", 200),
    enabled: !!user && user.role === "admin",
    select: (data) => data.filter((s) => s.suggestion_status === "pending"),
  });

  const { data: pendingReports = [] } = useQuery({
    queryKey: ["pending-reports-count"],
    queryFn: () => base44.entities.ContentReport.list("-created_at", 200),
    enabled: !!user && user.role === "admin",
    select: (data) => data.filter((r) => r.report_status === "pending"),
  });

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

  if (!user || user.role !== "admin") return null;

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
      <Button variant="ghost" size="sm" className="mb-4 gap-2 text-muted-foreground hover:text-foreground -ml-2"
        onClick={() => navigate(-1)}>
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Button>

      <div className="space-y-6">
        <div>
          <h1 className="font-space font-bold text-3xl text-foreground">Área Admin</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie o catálogo e a visibilidade das obras por categoria</p>
        </div>

        <Tabs defaultValue="catalog">
          <TabsList className="bg-secondary flex-wrap h-auto gap-1">
            <TabsTrigger value="catalog">Catálogo</TabsTrigger>
            <TabsTrigger value="dynamic">Catálogo Dinâmico</TabsTrigger>
            <TabsTrigger value="categories">Categorias</TabsTrigger>
            <TabsTrigger value="sync">Sincronização</TabsTrigger>
            <TabsTrigger value="suggestions" className="relative">
              Sugestões
              {pendingSuggestions.length > 0 && (
                <Badge className="ml-1.5 text-[10px] bg-chart-4/15 text-chart-4 border-none px-1.5 py-0">
                  {pendingSuggestions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="moderation" className="relative">
              Moderação
              {pendingReports.length > 0 && (
                <Badge className="ml-1.5 text-[10px] bg-destructive/15 text-destructive border-none px-1.5 py-0">
                  {pendingReports.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="maintenance">Manutenção</TabsTrigger>
            <TabsTrigger value="franchise">Unificar Obras</TabsTrigger>
            <TabsTrigger value="news">Notícias</TabsTrigger>
            <TabsTrigger value="appearance">Aparência</TabsTrigger>
            <TabsTrigger value="banners">Banners</TabsTrigger>
            <TabsTrigger value="login-images">Imagens de Login</TabsTrigger>
          </TabsList>
          <TabsContent value="catalog" className="mt-6">
            <CatalogManager />
          </TabsContent>
          <TabsContent value="dynamic" className="mt-6">
            <DynamicCatalogPanel />
          </TabsContent>
          <TabsContent value="categories" className="mt-6">
            <CategoryManager />
          </TabsContent>
          <TabsContent value="sync" className="mt-6">
            <CatalogSync />
          </TabsContent>
          <TabsContent value="suggestions" className="mt-6">
            <SuggestionsPanel />
          </TabsContent>
          <TabsContent value="moderation" className="mt-6">
            <ModerationPanel />
          </TabsContent>
          <TabsContent value="maintenance" className="mt-6">
            <MigrateEntriesPanel />
          </TabsContent>
          <TabsContent value="news" className="mt-6">
            <NewsManager />
          </TabsContent>
          <TabsContent value="appearance" className="mt-6">
            <AppearanceManager />
          </TabsContent>
          <TabsContent value="franchise" className="mt-6">
            <FranchiseMerger />
          </TabsContent>
          <TabsContent value="banners" className="mt-6">
            <BannersPanel />
          </TabsContent>
          <TabsContent value="login-images" className="mt-6">
            <LoginImagesPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}