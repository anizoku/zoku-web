import { TrendingUp, Star, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { CATALOG } from "@/lib/catalog";
import CatalogCardGrid from "@/components/catalog/CatalogCardGrid";
import CatalogCardList from "@/components/catalog/CatalogCardList";
import ViewToggle from "@/components/catalog/ViewToggle";
import AdminEditableCard from "@/components/admin/AdminEditableCard";
import SortControl from "@/components/catalog/SortControl";
import { useSortedWorks } from "@/hooks/useSortedWorks";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

// Top trending — sorted by rating, top 18
const trending = [...CATALOG]
  .sort((a, b) => b.rating - a.rating)
  .slice(0, 18)
  .map((item, i) => ({ ...item, rank: i + 1 }));

export default function Trending() {
  const navigate = useNavigate();
  const [view, setView] = useState(() => localStorage.getItem("trendingViewMode") || "grid");
  const [sort, setSort] = useState("rating");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => setIsAdmin(u?.role === "admin")).catch(() => {});
  }, []);

  const animes = useSortedWorks(trending.filter(i => i.categories.includes("anime")), sort);
  const mangas = useSortedWorks(trending.filter(i => i.categories.includes("manga")), sort);
  const movies = useSortedWorks(trending.filter(i => i.categories.includes("movie")), sort);
  const liveaction = useSortedWorks(trending.filter(i => i.categories.includes("liveaction")), sort);
  const all = useSortedWorks(trending, sort);

  function handleViewChange(v) {
    setView(v);
    localStorage.setItem("trendingViewMode", v);
  }



  function handleClick(item) {
    const tipo = item.categories.includes("anime") ? "anime"
      : item.categories.includes("manga") ? "manga" : "movie";
    navigate(`/obra/${item.slug}?tipo=${tipo}`);
  }

  function getFilterCategory(item) {
    if (item.categories.includes("anime")) return "anime";
    if (item.categories.includes("movie")) return "movie";
    if (item.categories.includes("liveaction")) return "liveaction";
    return "manga";
  }

  function renderGrid(data) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {data.map((item) => (
          <AdminEditableCard key={item.slug} item={item} isAdmin={isAdmin}>
            <CatalogCardGrid item={item} filterCategory={getFilterCategory(item)} onClick={handleClick} />
          </AdminEditableCard>
        ))}
      </div>
    );
  }

  function renderList(data) {
    return (
      <div className="flex flex-col gap-2">
        {data.map((item) => (
          <AdminEditableCard key={item.slug} item={item} isAdmin={isAdmin}>
            <CatalogCardList item={item} filterCategory={getFilterCategory(item)} onClick={handleClick} />
          </AdminEditableCard>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-space font-bold text-2xl text-foreground">Trending</h1>
            <p className="text-sm text-muted-foreground">Os mais populares do catálogo</p>
          </div>
        </div>
        <SortControl value={sort} onChange={setSort} />
        <ViewToggle view={view} onChange={handleViewChange} />
      </div>

      <Tabs defaultValue="all">
        <TabsList className="bg-secondary mb-6">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="anime">Animes</TabsTrigger>
          <TabsTrigger value="manga">Mangás</TabsTrigger>
          <TabsTrigger value="movie">Filmes</TabsTrigger>
          <TabsTrigger value="liveaction">Live Action</TabsTrigger>
        </TabsList>

        {[
          { key: "all", data: all },
          { key: "anime", data: animes },
          { key: "manga", data: mangas },
          { key: "movie", data: movies },
          { key: "liveaction", data: liveaction },
        ].map(({ key, data }) => (
          <TabsContent key={key} value={key}>
            {data.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-12 text-center">
                <TrendingUp className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Nenhuma obra em destaque nesta categoria</p>
              </div>
            ) : view === "grid" ? renderGrid(data) : renderList(data)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}