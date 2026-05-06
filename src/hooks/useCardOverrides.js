import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Loads ALL card overrides once and returns a Map<slug, override>
 * so any card can look up its override without extra fetches.
 */
export function useCardOverrides() {
  const { data: overrides = [] } = useQuery({
    queryKey: ["card-overrides"],
    queryFn: () => base44.entities.CardOverride.list("-edited_at", 500),
    staleTime: 5 * 60 * 1000,
  });

  const overrideMap = new Map();
  for (const o of overrides) {
    overrideMap.set(o.card_slug, o);
  }

  return overrideMap;
}

/**
 * Merges catalog item with its override (if any).
 * Returns display-ready fields.
 */
export function useCardDisplayData(item, overrideMap) {
  if (!item) return { displayTitle: "", displayImage: null, displayDescription: "", isManualOverride: false, overrideRecord: null };

  const override = overrideMap?.get(item.slug);

  return {
    displayTitle: override?.override_title || item.title,
    displayImage: override?.override_image_url || null,
    displayDescription: override?.override_description || "",
    isManualOverride: override?.is_manual_override === true,
    syncDisabled: override?.sync_disabled === true,
    overrideRecord: override || null,
  };
}