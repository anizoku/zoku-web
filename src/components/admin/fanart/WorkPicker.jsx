import { useState, useMemo } from "react";
import { useCatalog } from "@/contexts/CatalogContext";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * WorkPicker — seletor de obra do catálogo para vincular FanArt.
 * Substitui a edição manual de work_slug/work_title.
 *
 * Usa o catálogo canônico (CatalogContext) filtrando para categoria anime
 * (respeitando ANIME_ONLY). Ao selecionar, preenche work_slug e work_title
 * automaticamente.
 *
 * Props:
 * - value: { work_slug, work_title }
 * - onChange: ({ work_slug, work_title }) => void
 */
export default function WorkPicker({ value, onChange }) {
  const { catalog, isLoading } = useCatalog();
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);

  const animeWorks = useMemo(
    () => catalog.filter((w) => w.categories?.includes("anime")),
    [catalog]
  );

  const results = useMemo(() => {
    if (!query.trim() || query.trim().length < 2) return [];
    const q = query.toLowerCase();
    return animeWorks
      .filter(
        (w) =>
          w.title?.toLowerCase().includes(q) ||
          w.romaji_title?.toLowerCase().includes(q) ||
          w.franchise_title?.toLowerCase().includes(q) ||
          w.slug?.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [query, animeWorks]);

  // Resolve a obra selecionada do catálogo (para mostrar poster + título canônico)
  const selectedWork = useMemo(() => {
    if (!value?.work_slug) return null;
    return (
      animeWorks.find((w) => w.slug === value.work_slug) || {
        slug: value.work_slug,
        title: value.work_title || value.work_slug,
        franchise_poster_url: null,
      }
    );
  }, [value, animeWorks]);

  const handleSelect = (work) => {
    onChange({ work_slug: work.slug, work_title: work.title });
    setQuery("");
    setShowResults(false);
  };

  const handleRemove = () => {
    onChange({ work_slug: "", work_title: "" });
  };

  // Obra já vinculada — mostra card com poster + título + remover
  if (selectedWork) {
    return (
      <div className="flex items-center gap-3 bg-secondary rounded-lg p-2.5">
        <div className="w-10 h-14 rounded overflow-hidden bg-card shrink-0">
          {selectedWork.franchise_poster_url ? (
            <img
              src={selectedWork.franchise_poster_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : null}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {selectedWork.title}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            slug: {selectedWork.slug}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRemove}
          className="text-destructive/70 hover:text-destructive shrink-0"
        >
          <X className="w-4 h-4 mr-1" />
          Remover vínculo
        </Button>
      </div>
    );
  }

  // Busca — input + dropdown de resultados
  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          placeholder="Buscar anime..."
          className="bg-secondary border-none pl-9"
        />
      </div>
      {showResults && query.trim().length >= 2 && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowResults(false)} />
          <div className="absolute z-20 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="p-3 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : results.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground text-center">
                Nenhuma obra encontrada.
              </div>
            ) : (
              results.map((w) => (
                <button
                  key={w.slug}
                  onClick={() => handleSelect(w)}
                  className="w-full flex items-center gap-3 p-2 hover:bg-secondary text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <div className="w-8 h-12 rounded overflow-hidden bg-secondary shrink-0">
                    {w.franchise_poster_url && (
                      <img
                        src={w.franchise_poster_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {w.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{w.slug}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}