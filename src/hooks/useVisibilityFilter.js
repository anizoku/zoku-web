import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useMemo } from "react";

/**
 * Returns a filter function that respects admin visibility overrides.
 * Usage: const filterVisible = useVisibilityFilter("anime");
 *        const visible = items.filter(filterVisible);
 *
 * catKey: "show_in_animes" | "show_in_mangas" | "show_in_liveaction" | "show_in_filmes"
 * catalogKey: "anime" | "manga" | "liveaction" | "movie"
 */
const CAT_MAP = {
  anime:      { catKey: "show_in_animes",    catalogKey: "anime" },
  manga:      { catKey: "show_in_mangas",     catalogKey: "manga" },
  liveaction: { catKey: "show_in_liveaction", catalogKey: "liveaction" },
  movie:      { catKey: "show_in_filmes",     catalogKey: "movie" },
};

export function useVisibilityFilter(category) {
  const { data: visibilityRecords } = useQuery({
    queryKey: ["work-category-visibility"],
    queryFn: () => base44.entities.WorkCategoryVisibility.list("-updated_date", 500),
    initialData: [],
    staleTime: 30_000,
  });

  const visibilityMap = useMemo(() => {
    const m = new Map();
    for (const r of visibilityRecords) m.set(r.work_slug, r);
    return m;
  }, [visibilityRecords]);

  const { catKey, catalogKey } = CAT_MAP[category] || {};

  const filterFn = useMemo(() => {
    return (item) => {
      if (!catKey) return true;
      const record = visibilityMap.get(item.slug);
      if (record && catKey in record) {
        // Admin explicitly set this — use it as source of truth
        return record[catKey] === true;
      }
      // No record or field not set — fall back to catalog categories
      return item.categories?.includes(catalogKey) ?? false;
    };
  }, [visibilityMap, catKey, catalogKey]);

  return filterFn;
}