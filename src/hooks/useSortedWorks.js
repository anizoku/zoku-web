import { useMemo } from "react";
import { useOverrideMap } from "@/context/CardOverridesContext";

export const SORT_OPTIONS = [
  { value: "default", label: "Padrão" },
  { value: "az", label: "A–Z" },
  { value: "za", label: "Z–A" },
  { value: "rating_desc", label: "Melhor avaliados" },
  { value: "rating_asc", label: "Pior avaliados" },
];

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
          getDisplayTitle(a, overrideMap).localeCompare(getDisplayTitle(b, overrideMap), "pt-BR")
        );
      case "za":
        return arr.sort((a, b) =>
          getDisplayTitle(b, overrideMap).localeCompare(getDisplayTitle(a, overrideMap), "pt-BR")
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