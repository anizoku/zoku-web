import { Film } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getByCategory } from "@/lib/catalog";
import CatalogCardGrid from "@/components/catalog/CatalogCardGrid";
import CatalogCardList from "@/components/catalog/CatalogCardList";
import ViewToggle from "@/components/catalog/ViewToggle";

const films = getByCategory("movie");

function useViewMode(key, defaultValue = "grid") {
  const [view, setView] = useState(() => localStorage.getItem(key) || defaultValue);
  function onChange(v) {
    setView(v);
    localStorage.setItem(key, v);
  }
  return [view, onChange];
}

export default function Films() {
  const [search, setSearch] = useState("");
  const [view, setView] = useViewMode("filmesViewMode", "grid");
  const navigate = useNavigate();

  const filtered = films.filter((f) =>
    f.title.toLowerCase().includes(search.toLowerCase()) ||
    f.genres.some((g) => g.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-chart-5/10 flex items-center justify-center">
            <Film className="w-5 h-5 text-chart-5" />
          </div>
          <div>
            <h1 className="font-space font-bold text-2xl text-foreground">Filmes</h1>
            <p className="text-sm text-muted-foreground">{films.length} filmes no catálogo</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Input
          placeholder="Buscar filmes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm bg-secondary border-none flex-1 min-w-[180px]"
        />
        <ViewToggle view={view} onChange={setView} />
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((film) => (
            <CatalogCardGrid
              key={film.slug}
              item={film}
              filterCategory="movie"
              onClick={(item) => navigate(`/obra/${item.slug}?tipo=movie`)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((film) => (
            <CatalogCardList
              key={film.slug}
              item={film}
              filterCategory="movie"
              onClick={(item) => navigate(`/obra/${item.slug}?tipo=movie`)}
            />
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">Nenhum filme encontrado para "{search}"</p>
        </div>
      )}
    </div>
  );
}