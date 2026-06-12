import { Tv, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import CatalogCardGrid from "@/components/catalog/CatalogCardGrid";
import CatalogCardList from "@/components/catalog/CatalogCardList";
import ViewToggle from "@/components/catalog/ViewToggle";
import AdminEditableCard from "@/components/admin/AdminEditableCard";
import SortControl from "@/components/catalog/SortControl";
import GenreFilter from "@/components/catalog/GenreFilter";
import { useSortedWorks } from "@/hooks/useSortedWorks";
import { useVisibilityFilter } from "@/hooks/useVisibilityFilter";
import { base44 } from "@/api/base44Client";
import { useCatalog } from "@/contexts/CatalogContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Skeleton } from "@/components/ui/skeleton";
import SuggestWorkModal from "@/components/catalog/SuggestWorkModal";

function useViewMode(key, defaultValue = "grid") {
  const [view, setView] = useState(() => localStorage.getItem(key) || defaultValue);
  function onChange(v) {
    setView(v);
    localStorage.setItem(key, v);
  }
  return [view, onChange];
}

export default function Animes() {
  usePageTitle("Animes");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("az");
  const [view, setView] = useViewMode("animesViewMode", "grid");
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const navigate = useNavigate();
  const filterVisible = useVisibilityFilter("anime");
  const { getByCategory, isLoading } = useCatalog();

  useEffect(() => {
    base44.auth.me().then(u => setIsAdmin(u?.role === "admin")).catch(() => {});
  }, []);

  const allAnimes = useMemo(() => getByCategory("anime"), [getByCategory]);

  const normalizeStr = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const q = normalizeStr(search);

  const allGenres = useMemo(() => {
    const set = new Set();
    allAnimes.forEach(a => a.genres?.forEach(g => set.add(g)));
    return [...set].sort();
  }, [allAnimes]);

  const filtered = allAnimes.filter(filterVisible).filter((a) => {
    const textMatch = normalizeStr(a.title).includes(q) || a.genres.some((g) => normalizeStr(g).includes(q));
    const genreMatch = selectedGenres.length === 0 || selectedGenres.every(g => a.genres?.includes(g));
    return textMatch && genreMatch;
  });
  const sorted = useSortedWorks(filtered, sort);

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-chart-2/10 flex items-center justify-center">
            <Tv className="w-5 h-5 text-chart-2" />
          </div>
          <div>
            <h1 className="font-space font-bold text-2xl text-foreground">Animes</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} séries</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Input
          placeholder="Buscar por título ou gênero..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm bg-secondary border-none flex-1 min-w-[180px]"
        />
        <SortControl value={sort} onChange={setSort} />
        <ViewToggle view={view} onChange={setView} />
        <Button
          variant="outline"
          size="sm"
          className="text-xs border-primary/30 text-primary hover:bg-primary/10 shrink-0"
          onClick={() => setShowSuggest(true)}
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Sugerir obra
        </Button>
      </div>
      <SuggestWorkModal open={showSuggest} onClose={() => setShowSuggest(false)} workType="anime" />
      <div className="mb-6">
        <GenreFilter allGenres={allGenres} selectedGenres={selectedGenres} onChange={setSelectedGenres} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[2/3] w-full rounded-lg" />
              <Skeleton className="h-3 w-3/4 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
          ))}
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {sorted.map((anime) => (
            <AdminEditableCard key={anime.slug} item={anime} isAdmin={isAdmin} category="anime">
              <CatalogCardGrid
                item={anime}
                filterCategory="anime"
                onClick={(item) => navigate(`/obra/${item.slug}?tipo=anime`)}
              />
            </AdminEditableCard>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((anime) => (
            <AdminEditableCard key={anime.slug} item={anime} isAdmin={isAdmin} category="anime">
              <CatalogCardList
                item={anime}
                filterCategory="anime"
                onClick={(item) => navigate(`/obra/${item.slug}?tipo=anime`)}
              />
            </AdminEditableCard>
          ))}
        </div>
      )}

      {!isLoading && sorted.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">Nenhum anime encontrado para "{search}"</p>
        </div>
      )}
    </div>
  );
}