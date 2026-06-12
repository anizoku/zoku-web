import { useState, useEffect } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Star, Sparkles } from "lucide-react";
import { getRecommendations, buildTasteProfile } from "@/lib/recommendations";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import CatalogCardGrid from "@/components/catalog/CatalogCardGrid";
import AdminEditableCard from "@/components/admin/AdminEditableCard";

const CATEGORIES = [
  { value: "all", label: "Todos" },
  { value: "anime", label: "Animes" },
  { value: "manga", label: "Mangás" },
  { value: "movie", label: "Filmes" },
  { value: "liveaction", label: "Live-Action" },
];

export default function Recommendations() {
  usePageTitle("Recomendações");
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      setIsAdmin(u?.role === "admin");
    }).catch(() => {});
  }, []);

  const { data: entries = [] } = useQuery({
    queryKey: ["anime-entries"],
    queryFn: () => base44.entities.AnimeEntry.list("-updated_date", 500),
    initialData: [],
  });

  const myEntries = entries.filter((e) => e.created_by === user?.email);
  const profile = buildTasteProfile(myEntries);
  const isNewUser = myEntries.length === 0 || profile.topGenres.length === 0;

  function getFilterCategory(item) {
    if (item.categories.includes("anime")) return "anime";
    if (item.categories.includes("movie")) return "movie";
    if (item.categories.includes("liveaction")) return "liveaction";
    return "manga";
  }

  function handleClick(item) {
    const tipo = item.categories.includes("anime") ? "anime"
      : item.categories.includes("manga") ? "manga" : "movie";
    navigate(`/obra/${item.slug}?tipo=${tipo}`);
  }

  function renderGrid(items) {
    if (items.length === 0) {
      return (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Sparkles className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Nenhuma recomendação disponível para esta categoria.</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {items.map((item) => (
          <AdminEditableCard key={item.slug} item={item} isAdmin={isAdmin}>
            <CatalogCardGrid item={item} filterCategory={getFilterCategory(item)} onClick={handleClick} />
          </AdminEditableCard>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-space font-bold text-2xl text-foreground">Recomendações para você</h1>
          <p className="text-sm text-muted-foreground">
            {isNewUser
              ? "Adicione obras à sua lista para receber recomendações personalizadas"
              : `Baseado nos seus gêneros favoritos: ${profile.topGenres.slice(0, 3).join(", ")}`}
          </p>
        </div>
      </div>

      {isNewUser && (
        <div className="bg-card rounded-xl border border-border p-5 mb-6">
          <div className="flex items-start gap-3">
            <Star className="w-5 h-5 text-chart-4 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Recomendações padrão</p>
              <p className="text-xs text-muted-foreground">
                Você ainda não tem obras na sua lista. Exibindo as obras mais bem avaliadas do catálogo.
                Adicione obras para receber sugestões personalizadas!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Gêneros top (só quando personalizado) */}
      {!isNewUser && profile.topGenres.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-6">
          {profile.topGenres.map((g) => (
            <Badge key={g} className="bg-primary/10 text-primary border-none text-xs">{g}</Badge>
          ))}
        </div>
      )}

      <Tabs defaultValue="all">
        <TabsList className="bg-secondary mb-6 flex-wrap h-auto gap-1">
          {CATEGORIES.map((c) => (
            <TabsTrigger key={c.value} value={c.value}>{c.label}</TabsTrigger>
          ))}
        </TabsList>
        {CATEGORIES.map((c) => {
          const recs = getRecommendations(
            myEntries,
            c.value === "all" ? null : c.value,
            30
          );
          return (
            <TabsContent key={c.value} value={c.value}>
              {renderGrid(recs)}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}