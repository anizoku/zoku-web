import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CATALOG } from "@/lib/catalog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { toast } from "sonner";

const CATS = [
  { key: "show_in_animes", label: "Animes", catalogKey: "anime" },
  { key: "show_in_mangas", label: "Mangás", catalogKey: "manga" },
  { key: "show_in_liveaction", label: "Live-Action", catalogKey: "liveaction" },
  { key: "show_in_filmes", label: "Filmes", catalogKey: "movie" },
];

export default function CategoryManager() {
  const [search, setSearch] = useState("");
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: visibilityRecords } = useQuery({
    queryKey: ["work-category-visibility"],
    queryFn: () => base44.entities.WorkCategoryVisibility.list("-updated_date", 500),
    initialData: [],
  });

  // Build a map: slug -> visibility record
  const visibilityMap = useMemo(() => {
    const m = new Map();
    for (const r of visibilityRecords) m.set(r.work_slug, r);
    return m;
  }, [visibilityRecords]);

  const updateMutation = useMutation({
    mutationFn: async ({ slug, title, catKey, value }) => {
      const existing = visibilityMap.get(slug);
      if (existing) {
        return base44.entities.WorkCategoryVisibility.update(existing.id, {
          [catKey]: value,
          updated_by: user?.email,
        });
      } else {
        // Create new record with current catalog defaults first
        const item = CATALOG.find(c => c.slug === slug);
        const defaults = {};
        for (const cat of CATS) {
          defaults[cat.key] = item?.categories?.includes(cat.catalogKey) ?? false;
        }
        return base44.entities.WorkCategoryVisibility.create({
          work_slug: slug,
          work_title: title,
          ...defaults,
          [catKey]: value,
          updated_by: user?.email,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-category-visibility"] });
      toast.success("Visibilidade atualizada");
    },
    onError: () => toast.error("Erro ao salvar"),
  });

  function isVisible(slug, catKey, catalogKey) {
    const record = visibilityMap.get(slug);
    if (record) return record[catKey] ?? true;
    // Default: use catalog categories
    const item = CATALOG.find(c => c.slug === slug);
    return item?.categories?.includes(catalogKey) ?? false;
  }

  const filteredCatalog = useMemo(() =>
    CATALOG.filter(item =>
      item.title.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => a.title.localeCompare(b.title, "pt-BR")),
    [search]
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-space font-bold text-xl text-foreground mb-1">Gerenciar categorias das obras</h2>
        <p className="text-sm text-muted-foreground">Controle em quais seções cada obra aparece. As mudanças têm prioridade sobre os dados importados.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Filtrar obras..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-secondary border-none"
        />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_repeat(4,_80px)] gap-2 px-4 py-2.5 border-b border-border bg-secondary/50">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Obra</span>
          {CATS.map(cat => (
            <span key={cat.key} className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">{cat.label}</span>
          ))}
        </div>

        <div className="divide-y divide-border max-h-[60vh] overflow-y-auto">
          {filteredCatalog.map(item => (
            <div key={item.slug} className="grid grid-cols-[1fr_repeat(4,_80px)] gap-2 px-4 py-2.5 items-center hover:bg-secondary/30 transition-colors">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                <p className="text-[10px] text-muted-foreground">{item.categories.join(", ")}</p>
              </div>
              {CATS.map(cat => {
                const checked = isVisible(item.slug, cat.key, cat.catalogKey);
                return (
                  <div key={cat.key} className="flex justify-center">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => updateMutation.mutate({
                        slug: item.slug,
                        title: item.title,
                        catKey: cat.key,
                        value: e.target.checked,
                      })}
                      className="w-4 h-4 accent-primary cursor-pointer"
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{filteredCatalog.length} obras · {visibilityRecords.length} com configuração manual</p>
    </div>
  );
}