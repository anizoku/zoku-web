import { useMemo } from "react";
import { useOverrideMap } from "@/context/CardOverridesContext";

export const SORT_OPTIONS = [
  { value: "az", label: "A–Z" },
  { value: "za", label: "Z–A" },
  { value: "rating_desc", label: "Melhor avaliados" },
  { value: "rating_asc", label: "Pior avaliados" },
];

function normalizeTitle(s) {
  return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function getDisplayTitle(item, overrideMap) {
  const override = overrideMap?.get(item.slug);
  return override?.override_title || item.title || "";
}

export function useSortedWorks(works, sortMode) {
  const overrideMap = useOverrideMap();

  return useMemo(() => {
    if (!works || works.length === 0) return works;
    const arr = [...works];

    switch (sortMode) {
      case "az":
        return arr.sort((a, b) =>
          normalizeTitle(getDisplayTitle(a, overrideMap)).localeCompare(
            normalizeTitle(getDisplayTitle(b, overrideMap)), "pt-BR", { sensitivity: "base" }
          )
        );
      case "za":
        return arr.sort((a, b) =>
          normalizeTitle(getDisplayTitle(b, overrideMap)).localeCompare(
            normalizeTitle(getDisplayTitle(a, overrideMap)), "pt-BR", { sensitivity: "base" }
          )
        );
      case "rating_desc":
        return arr.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case "rating_asc":
        return arr.sort((a, b) => (a.rating || 0) - (b.rating || 0));
      default:
        return arr;
    }
  }, [works, sortMode, overrideMap]);
}