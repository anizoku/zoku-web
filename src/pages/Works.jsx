import { Library, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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

const CATEGORIES = [
  { key: "all", label: "Todos" },
  { key: "anime", label: "Animes" },
  { key: "manga", label: "Mangás" },
  { key: "movie", label: "Filmes" },
  { key: "liveaction", label: "Live-Action" },
];

const PAGE_TITLES = {
  all: "Obras",
  anime: "Animes",
  manga: "Mangás",
  movie: "Filmes",
  liveaction: "Live-Action",
};

const SUGGEST_TYPE = {
  anime: "anime",
  manga: "manga",
  movie: "anime",
  liveaction: "anime",
  all: "anime",
};

function useViewMode(key, defaultValue = "grid") {
  const [view, setView] = useState(() => localStorage.getItem(key) || defaultValue);
  function onChange(v) {
    setView(v);
    localStorage.setItem(key, v);
  }
  return [view, onChange];
}

export default function Works() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoria = searchParams.get("categoria") || "all";

  usePageTitle(`ZOKU — ${PAGE_TITLES[categoria] || "Obras"}`);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("az");
  const [view, setView] = useViewMode("worksViewMode", "grid");
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const navigate = useNavigate();
  const { catalog, getByCategory, isLoading } = useCatalog();
  const filterVisibleAnime = useVisibilityFilter("anime");
  const filterVisibleManga = useVisibilityFilter("manga");
  const filterVisibleMovie = useVisibilityFilter("movie");
  const filterVisibleLive = useVisibilityFilter("liveaction");

  useEffect(() => {
    base44.auth.me().then(u => setIsAdmin(u?.role === "admin")).catch(() => {});
  }, []);

  function setCategoria(key) {
    setSearchParams(key === "all" ? {} : { categoria: key });
    setSelectedGenres([]);
  }

  const allWorks = useMemo(() => {
    if (categoria === "all") return catalog;
    return getByCategory(categoria);
  }, [categoria, catalog, getByCategory]);

  function applyVisibilityFilter(works) {
    if (categoria === "all") return works;
    if (categoria === "anime") return works.filter(filterVisibleAnime);
    if (categoria === "manga") return works.filter(filterVisibleManga);
    if (categoria === "movie") return works.filter(filterVisibleMovie);
    if (categoria === "liveaction") return works.filter(filterVisibleLive);
    return works;
  }

  const normalizeStr = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const q = normalizeStr(search);

  const allGenres = useMemo(() => {
    const set = new Set();
    allWorks.forEach(w => w.genres?.forEach(g => set.add(g)));
    return [...set].sort();
  }, [allWorks]);

  const filtered = applyVisibilityFilter(allWorks).filter((w) => {
    const textMatch = !q ||
      normalizeStr(w.title).includes(q) ||
      normalizeStr(w.romaji_title).includes(q) ||
      (w.genres || []).some(g => normalizeStr(g).includes(q));
    const genreMatch = selectedGenres.length === 0 || selectedGenres.every(g => w.genres?.includes(g));
    return textMatch && genreMatch;
  });

  const sorted = useSortedWorks(filtered, sort);

  function getCategoryForCard(item) {
    if (categoria !== "all") return categoria;
    return item.categories?.[0] || "anime";
  }

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Library className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-space font-bold text-2xl text-foreground">{PAGE_TITLES[categoria] || "Obras"}</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} obras</p>
          </div>
        </div>
      </div>

      {/* Category pills */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setCategoria(cat.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
              categoria === cat.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-secondary-foreground border-transparent hover:border-primary/30"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Search + controls */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Input
          placeholder="Buscar por título, romaji ou gênero..."
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

      <SuggestWorkModal open={showSuggest} onClose={() => setShowSuggest(false)} workType={SUGGEST_TYPE[categoria]} />

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
          {sorted.map((work) => {
            const cat = getCategoryForCard(work);
            return (
              <AdminEditableCard key={`${work.slug}-${cat}`} item={work} isAdmin={isAdmin} category={cat}>
                <CatalogCardGrid
                  item={work}
                  filterCategory={cat}
                  onClick={(item) => navigate(`/obra/${item.slug}?tipo=${cat}`)}
                />
              </AdminEditableCard>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((work) => {
            const cat = getCategoryForCard(work);
            return (
              <AdminEditableCard key={`${work.slug}-${cat}`} item={work} isAdmin={isAdmin} category={cat}>
                <CatalogCardList
                  item={work}
                  filterCategory={cat}
                  onClick={(item) => navigate(`/obra/${item.slug}?tipo=${cat}`)}
                />
              </AdminEditableCard>
            );
          })}
        </div>
      )}

      {!isLoading && sorted.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">Nenhuma obra encontrada{search ? ` para "${search}"` : ""}.</p>
        </div>
      )}
    </div>
  );
}