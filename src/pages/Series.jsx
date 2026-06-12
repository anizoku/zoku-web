import { Clapperboard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getByCategory } from "@/lib/catalog";
import CatalogCardGrid from "@/components/catalog/CatalogCardGrid";
import CatalogCardList from "@/components/catalog/CatalogCardList";
import ViewToggle from "@/components/catalog/ViewToggle";
import AdminEditableCard from "@/components/admin/AdminEditableCard";
import SortControl from "@/components/catalog/SortControl";
import { useSortedWorks } from "@/hooks/useSortedWorks";
import { useVisibilityFilter } from "@/hooks/useVisibilityFilter";
import { base44 } from "@/api/base44Client";
import { CATALOG } from "@/lib/catalog";

const allLiveAction = CATALOG.filter(item => item.categories?.includes("liveaction"));

function useViewMode(key, defaultValue = "grid") {
  const [view, setView] = useState(() => localStorage.getItem(key) || defaultValue);
  function onChange(v) {
    setView(v);
    localStorage.setItem(key, v);
  }
  return [view, onChange];
}

export default function Series() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("az");
  const [view, setView] = useViewMode("liveactionViewMode", "grid");
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const filterVisible = useVisibilityFilter("liveaction");

  useEffect(() => {
    base44.auth.me().then(u => setIsAdmin(u?.role === "admin")).catch(() => {});
  }, []);

  const normalizeStr = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const q = normalizeStr(search);
  const filtered = allLiveAction.filter(filterVisible).filter((s) =>
    normalizeStr(s.title).includes(q) ||
    normalizeStr(s.liveActionTitle || "").includes(q) ||
    s.genres.some((g) => normalizeStr(g).includes(q))
  );
  const sorted = useSortedWorks(filtered, sort);

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-chart-1/10 flex items-center justify-center">
            <Clapperboard className="w-5 h-5 text-chart-1" />
          </div>
          <div>
            <h1 className="font-space font-bold text-2xl text-foreground">Live-Action</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} adaptações</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Input
          placeholder="Buscar por título ou gênero..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm bg-secondary border-none flex-1 min-w-[180px]"
        />
        <SortControl value={sort} onChange={setSort} />
        <ViewToggle view={view} onChange={setView} />
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {sorted.map((item) => (
            <AdminEditableCard key={item.slug} item={item} isAdmin={isAdmin} category="liveaction">
              <CatalogCardGrid item={item} filterCategory="liveaction" onClick={(i) => navigate(`/obra/${i.slug}?tipo=liveaction`)} />
            </AdminEditableCard>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((item) => (
            <AdminEditableCard key={item.slug} item={item} isAdmin={isAdmin} category="liveaction">
              <CatalogCardList item={item} filterCategory="liveaction" onClick={(i) => navigate(`/obra/${i.slug}?tipo=liveaction`)} />
            </AdminEditableCard>
          ))}
        </div>
      )}

      {sorted.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">Nenhuma adaptação encontrada para "{search}"</p>
        </div>
      )}
    </div>
  );
}