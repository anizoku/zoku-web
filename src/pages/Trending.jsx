import { TrendingUp, Star, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { CATALOG } from "@/lib/catalog";
import CatalogCardGrid from "@/components/catalog/CatalogCardGrid";
import CatalogCardList from "@/components/catalog/CatalogCardList";
import ViewToggle from "@/components/catalog/ViewToggle";
import { useState } from "react";

// Top trending — sorted by rating, top 18
const trending = [...CATALOG]
  .sort((a, b) => b.rating - a.rating)
  .slice(0, 18)
  .map((item, i) => ({ ...item, rank: i + 1 }));

export default function Trending() {
  const navigate = useNavigate();
  const [view, setView] = useState(() => localStorage.getItem("trendingViewMode") || "grid");

  function handleViewChange(v) {
    setView(v);
    localStorage.setItem("trendingViewMode", v);
  }

  const animes = trending.filter(i => i.categories.includes("anime"));
  const mangas = trending.filter(i => i.categories.includes("manga"));
  const movies = trending.filter(i => i.categories.includes("movie"));

  function handleClick(item) {
    const tipo = item.categories.includes("anime") ? "anime"
      : item.categories.includes("manga") ? "manga" : "movie";
    navigate(`/obra/${item.slug}?tipo=${tipo}`);
  }

  function getFilterCategory(item) {
    if (item.categories.includes("anime")) return "anime";
    if (item.categories.includes("movie")) return "movie";
    return "manga";
  }

  function renderGrid(data) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {data.map((item) => (
          <CatalogCardGrid
            key={item.slug}
            item={item}
            filterCategory={getFilterCategory(item)}
            onClick={handleClick}
          />
        ))}
      </div>
    );
  }

  function renderList(data) {
    return (
      <div className="flex flex-col gap-2">
        {data.map((item) => (
          <CatalogCardList
            key={item.slug}
            item={item}
            filterCategory={getFilterCategory(item)}
            onClick={handleClick}
          />
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
        <ViewToggle view={view} onChange={handleViewChange} />
      </div>

      <Tabs defaultValue="all">
        <TabsList className="bg-secondary mb-6">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="anime">Animes</TabsTrigger>
          <TabsTrigger value="manga">Mangás</TabsTrigger>
          <TabsTrigger value="movie">Filmes</TabsTrigger>
        </TabsList>

        {[
          { key: "all", data: trending },
          { key: "anime", data: animes },
          { key: "manga", data: mangas },
          { key: "movie", data: movies },
        ].map(({ key, data }) => (
          <TabsContent key={key} value={key}>
            {view === "grid" ? renderGrid(data) : renderList(data)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}