import { BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
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
import { CATALOG } from "@/lib/catalog";

const allMangas = CATALOG.filter(item => item.categories?.includes("manga"));

function useViewMode(key, defaultValue = "grid") {
  const [view, setView] = useState(() => localStorage.getItem(key) || defaultValue);
  function onChange(v) {
    setView(v);
    localStorage.setItem(key, v);
  }
  return [view, onChange];
}

export default function Mangas() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("az");
  const [view, setView] = useViewMode("mangasViewMode", "grid");
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const filterVisible = useVisibilityFilter("manga");

  useEffect(() => {
    base44.auth.me().then(u => setIsAdmin(u?.role === "admin")).catch(() => {});
  }, []);

  const normalizeStr = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const q = normalizeStr(search);

  const allGenres = useMemo(() => {
    const set = new Set();
    allMangas.forEach(m => m.genres?.forEach(g => set.add(g)));
    return [...set].sort();
  }, []);

  const filtered = allMangas.filter(filterVisible).filter((m) => {
    const textMatch = normalizeStr(m.title).includes(q) || m.genres.some((g) => normalizeStr(g).includes(q));
    const genreMatch = selectedGenres.length === 0 || selectedGenres.every(g => m.genres?.includes(g));
    return textMatch && genreMatch;
  });
  const sorted = useSortedWorks(filtered, sort);

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-chart-3/10 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-chart-3" />
          </div>
          <div>
            <h1 className="font-space font-bold text-2xl text-foreground">Mangás</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} obras</p>
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
      </div>
      <div className="mb-6">
        <GenreFilter allGenres={allGenres} selectedGenres={selectedGenres} onChange={setSelectedGenres} />
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {sorted.map((manga) => (
            <AdminEditableCard key={manga.slug} item={manga} isAdmin={isAdmin} category="manga">
              <CatalogCardGrid item={manga} filterCategory="manga" onClick={(item) => navigate(`/obra/${item.slug}?tipo=manga`)} />
            </AdminEditableCard>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((manga) => (
            <AdminEditableCard key={manga.slug} item={manga} isAdmin={isAdmin} category="manga">
              <CatalogCardList item={manga} filterCategory="manga" onClick={(item) => navigate(`/obra/${item.slug}?tipo=manga`)} />
            </AdminEditableCard>
          ))}
        </div>
      )}

      {sorted.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">Nenhum mangá encontrado para "{search}"</p>
        </div>
      )}
    </div>
  );
}