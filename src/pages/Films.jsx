import { Film } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import CatalogCardGrid from "@/components/catalog/CatalogCardGrid";
import CatalogCardList from "@/components/catalog/CatalogCardList";
import ViewToggle from "@/components/catalog/ViewToggle";
import AdminEditableCard from "@/components/admin/AdminEditableCard";
import SortControl from "@/components/catalog/SortControl";
import { useSortedWorks } from "@/hooks/useSortedWorks";
import { useVisibilityFilter } from "@/hooks/useVisibilityFilter";
import { base44 } from "@/api/base44Client";
import { useCatalog } from "@/contexts/CatalogContext";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [sort, setSort] = useState("az");
  const [view, setView] = useViewMode("filmesViewMode", "grid");
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const filterVisible = useVisibilityFilter("movie");
  const { getByCategory, isLoading } = useCatalog();

  useEffect(() => {
    base44.auth.me().then(u => setIsAdmin(u?.role === "admin")).catch(() => {});
  }, []);

  const allFilms = useMemo(() => getByCategory("movie"), [getByCategory]);

  const normalizeStr = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const q = normalizeStr(search);
  const filtered = allFilms.filter(filterVisible).filter((f) =>
    normalizeStr(f.title).includes(q) ||
    normalizeStr(f.romaji_title).includes(q) ||
    f.genres.some((g) => normalizeStr(g).includes(q))
  );
  const sorted = useSortedWorks(filtered, sort);

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-chart-5/10 flex items-center justify-center">
            <Film className="w-5 h-5 text-chart-5" />
          </div>
          <div>
            <h1 className="font-space font-bold text-2xl text-foreground">Filmes</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} filmes</p>
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
        <SortControl value={sort} onChange={setSort} />
        <ViewToggle view={view} onChange={setView} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[2/3] w-full rounded-lg" />
              <Skeleton className="h-3 w-3/4 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
          ))}
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {sorted.map((film) => (
            <AdminEditableCard key={film.slug} item={film} isAdmin={isAdmin} category="movie">
              <CatalogCardGrid item={film} filterCategory="movie" onClick={(item) => navigate(`/obra/${item.slug}?tipo=movie`)} />
            </AdminEditableCard>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((film) => (
            <AdminEditableCard key={film.slug} item={film} isAdmin={isAdmin} category="movie">
              <CatalogCardList item={film} filterCategory="movie" onClick={(item) => navigate(`/obra/${item.slug}?tipo=movie`)} />
            </AdminEditableCard>
          ))}
        </div>
      )}

      {!isLoading && sorted.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">Nenhum filme encontrado para "{search}"</p>
        </div>
      )}
    </div>
  );
}