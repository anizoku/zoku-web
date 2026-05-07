import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Loads ALL card overrides once and returns a Map keyed by "slug:category"
 * (plus a fallback key "slug" for legacy records without category).
 */
export function useCardOverrides() {
  const { data: overrides = [] } = useQuery({
    queryKey: ["card-overrides"],
    queryFn: () => base44.entities.CardOverride.list("-edited_at", 500),
    staleTime: 5 * 60 * 1000,
  });

  const overrideMap = new Map();
  for (const o of overrides) {
    if (o.category) {
      overrideMap.set(`${o.card_slug}:${o.category}`, o);
    } else {
      // legacy override without category — store under bare slug as fallback
      overrideMap.set(o.card_slug, o);
    }
  }

  return overrideMap;
}

/**
 * Merges catalog item with its override for a specific category.
 * category-specific key takes priority; falls back to bare slug for legacy records.
 */
export function useCardDisplayData(item, overrideMap, category) {
  if (!item) return { displayTitle: "", displayImage: null, displayDescription: "", isManualOverride: false, overrideRecord: null };

  const categoryKey = category ? `${item.slug}:${category}` : null;
  // For category-specific lookups, ONLY use the category-specific override.
  // Legacy bare-slug overrides are only used when no category is specified.
  const override = categoryKey
    ? (overrideMap?.get(categoryKey) || null)
    : (overrideMap?.get(item.slug) || null);

  return {
    displayTitle: override?.override_title || item.title,
    displayImage: override?.override_image_url || null,
    displayDescription: override?.override_description || "",
    isManualOverride: override?.is_manual_override === true,
    syncDisabled: override?.sync_disabled === true,
    overrideRecord: override || null,
  };
}