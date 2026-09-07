import { Library, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useUrlParam, useUrlArrayParam } from "@/hooks/useUrlParam";
import { base44 } from "@/api/base44Client";
import { useCatalog } from "@/contexts/CatalogContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Skeleton } from "@/components/ui/skeleton";
import SuggestWorkModal from "@/components/catalog/SuggestWorkModal";
import TrendingStrip from "@/components/catalog/TrendingStrip";
import { hybridSearch } from "@/lib/hybridSearch";
import { ACTIVE_CATEGORY_TABS, isCategoryFrozen, ANIME_ONLY_MODE } from "@/lib/scopeConfig";
import FrozenCategory from "@/pages/FrozenCategory";

// ANIME_ONLY: apenas categorias ativas aparecem nas tabs
const CATEGORIES = ACTIVE_CATEGORY_TABS;

const PAGE_TITLES = {
  all: "Obras",
  anime: "Animes",
  manga: "Mangás",
  movie: "Filmes",
  liveaction: "Live-Action",
};

const SUGGEST_TYPE = {
  anime: "anime",
  manga: "anime",
  movie: "anime",
  liveaction: "anime",
  all: "anime",
};

const ITEMS_PER_PAGE = 48;

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
  const pagina = parseInt(searchParams.get("pagina") || "1");

  usePageTitle(`ZOKU — ${PAGE_TITLES[categoria] || "Obras"}`);

  const [search, setSearch] = useUrlParam("q", "");
  const sort = searchParams.get("ordenar") || "rating";
  function setSort(value) {
    const params = new URLSearchParams(searchParams.toString());
    if (value !== "rating") params.set("ordenar", value); else params.delete("ordenar");
    params.delete("pagina");
    setSearchParams(params, { replace: true });
  }
  const [view, setView] = useViewMode("worksViewMode", "grid");
  const [selectedGenres, setSelectedGenres] = useUrlArrayParam("generos");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const [externalResults, setExternalResults] = useState([]);
  const [searchTimeout, setSearchTimeout] = useState(null);
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
    setExternalResults([]);
    const params = new URLSearchParams(searchParams.toString());
    if (key === "all") params.delete("categoria"); else params.set("categoria", key);
    params.delete("pagina");
    params.delete("ordenar");
    params.delete("q");
    params.delete("generos");
    setSearchParams(params, { replace: true });
  }

  function setPagina(p) {
    const params = new URLSearchParams(searchParams.toString());
    if (p > 1) params.set("pagina", p); else params.delete("pagina");
    setSearchParams(params, { replace: true });
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

  // Busca dinâmica externa após 800ms sem digitação
  useEffect(() => {
    if (searchTimeout) clearTimeout(searchTimeout);

    if (search.trim().length < 2) {
      setExternalResults([]);
      return;
    }

    setSearchTimeout(
      setTimeout(async () => {
        try {
          // Se não há resultados locais, buscar em Jikan + TMDB
          if (filtered.length === 0) {
            const results = await hybridSearch(search);
            setExternalResults(results);
          }
        } catch (e) {
          console.warn("Busca externa falhou:", e);
        }
      }, 800)
    );

    return () => {
      if (searchTimeout) clearTimeout(searchTimeout);
    };
  }, [search, filtered.length]);

  const sorted = useSortedWorks(filtered, sort);

  // Paginação
  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const validPage = Math.max(1, Math.min(pagina, totalPages || 1));
  const start = (validPage - 1) * ITEMS_PER_PAGE;
  const paginatedWorks = sorted.slice(start, start + ITEMS_PER_PAGE);

  function getCategoryForCard(item) {
    if (categoria !== "all") return categoria;
    return item.categories?.[0] || "anime";
  }

  async function handleAddExternal(externalWork) {
    try {
      // Criar na DynamicWork
      const slug = ((externalWork.title_english || externalWork.title) || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");

      // ANIME_ONLY: forçar anime durante o freeze
      const workType = ANIME_ONLY_MODE ? "anime" : (externalWork.type?.toLowerCase().includes("manga") ? "manga" : "anime");
      const categories = workType === "manga" ? ["manga"] : ["anime"];
      const source = externalWork._source || "jikan";

      await base44.entities.DynamicWork.create({
        slug,
        title: externalWork.title_english || externalWork.title,
        romaji_title: externalWork.title !== (externalWork.title_english || externalWork.title) ? externalWork.title : null,
        categories: JSON.stringify(categories),
        genres: JSON.stringify((externalWork.genres || []).map(g => typeof g === "string" ? g : g.name)),
        mal_id: workType === "anime" && source === "jikan" ? externalWork.mal_id : null,
        manga_mal_id: workType === "manga" && source === "jikan" ? externalWork.mal_id : null,
        score: externalWork.score || null,
        image_url: externalWork.images?.jpg?.large_image_url || externalWork.images?.jpg?.small_image_url || null,
        source: source,
      });

      setExternalResults([]);
      setSearch("");
    } catch (e) {
      console.warn("Erro ao adicionar obra:", e);
    }
  }

  // ANIME_ONLY: redirecionar categorias congeladas para a página de freeze
  // (depois de todos os hooks para não violar Rules of Hooks)
  if (ANIME_ONLY_MODE && isCategoryFrozen(categoria)) {
    return <FrozenCategory category={categoria} />;
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

      {/* Category selector — uniform with Trending page */}
      <Tabs value={categoria} onValueChange={setCategoria} className="mb-5">
        <TabsList className="bg-secondary">
          {CATEGORIES.map(cat => (
            <TabsTrigger key={cat.key} value={cat.key}>{cat.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

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

      {/* Em Alta — trending strip (only when browsing, not searching) */}
      {!search.trim() && selectedGenres.length === 0 && !isLoading && (
        <TrendingStrip works={allWorks} isAdmin={isAdmin} />
      )}

      {/* Resultados externos */}
      {externalResults.length > 0 && filtered.length < 3 && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-muted-foreground mb-3">Resultados externos (Jikan + TMDB)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {externalResults.map((work) => (
              <button
                key={work.mal_id || work._tmdbId}
                  onClick={() => handleAddExternal(work)}
                className="rounded-lg border border-border bg-card p-2 hover:bg-secondary transition-all space-y-2"
              >
                <img
                  src={work.images?.jpg?.small_image_url}
                  alt={work.title}
                  className="w-full aspect-[2/3] rounded object-cover"
                />
                <p className="text-xs font-medium line-clamp-2 text-foreground">{work.title}</p>
                {work.score && <p className="text-[10px] text-primary">★ {work.score}/10</p>}
                <Button size="sm" variant="outline" className="w-full text-xs">
                  <Plus className="w-3 h-3 mr-1" /> Adicionar
                </Button>
              </button>
            ))}
          </div>
        </div>
      )}

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
          {paginatedWorks.map((work) => {
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
          {paginatedWorks.map((work) => {
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

      {/* Paginação */}
      {!isLoading && sorted.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-center gap-3 mt-8 pt-6 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagina(validPage - 1)}
            disabled={validPage <= 1}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {validPage} de {totalPages} · Exibindo {start + 1}–{Math.min(start + ITEMS_PER_PAGE, sorted.length)} de {sorted.length}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagina(validPage + 1)}
            disabled={validPage >= totalPages}
            className="gap-2"
          >
            Próxima <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}