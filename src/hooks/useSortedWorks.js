import { useMemo } from "react";
import { useOverrideMap } from "@/context/CardOverridesContext";

export const SORT_OPTIONS = [
  { value: "rating", label: "Melhor Avaliadas" },
  { value: "az", label: "Nome (A-Z)" },
  { value: "za", label: "Nome (Z-A)" },
  { value: "recent", label: "Mais Recentes" },
  { value: "popular", label: "Mais Populares" },
];

function normalizeTitle(s) {
  return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function getDisplayTitle(item, overrideMap) {
  const override = overrideMap?.get(item.slug);
  return override?.override_title || item.title || "";
}

function getRating(item) {
  // Usa franchise_score (canônico) quando disponível, senão score/rating
  return item.franchise_score || item.rating || item.score || 0;
}

function getPopularity(item) {
  return item.popularity_rank || item.popularity || Infinity;
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
      case "rating":
      case "rating_desc":
        // Melhor avaliadas. Obras sem nota vão para o final.
        // Desempate: popularidade (menor rank = mais popular), depois alfabética.
        return arr.sort((a, b) => {
          const ra = getRating(a), rb = getRating(b);
          const aHas = ra > 0, bHas = rb > 0;
          if (aHas !== bHas) return aHas ? -1 : 1;
          if (rb !== ra) return rb - ra;
          const pa = getPopularity(a), pb = getPopularity(b);
          if (pa !== pb) return pa - pb;
          return normalizeTitle(getDisplayTitle(a, overrideMap))
            .localeCompare(normalizeTitle(getDisplayTitle(b, overrideMap)), "pt-BR", { sensitivity: "base" });
        });
      case "recent":
        // Mais recentes primeiro (por ano). Sem ano → final. Desempate alfabético.
        return arr.sort((a, b) => {
          const ya = a.year || 0, yb = b.year || 0;
          if (yb !== ya) return yb - ya;
          return normalizeTitle(getDisplayTitle(a, overrideMap))
            .localeCompare(normalizeTitle(getDisplayTitle(b, overrideMap)), "pt-BR", { sensitivity: "base" });
        });
      case "popular":
        // Mais populares primeiro (menor popularity_rank). Sem rank → final. Desempate alfabético.
        return arr.sort((a, b) => {
          const pa = getPopularity(a), pb = getPopularity(b);
          if (pa !== pb) return pa - pb;
          return normalizeTitle(getDisplayTitle(a, overrideMap))
            .localeCompare(normalizeTitle(getDisplayTitle(b, overrideMap)), "pt-BR", { sensitivity: "base" });
        });
      default:
        return arr;
    }
  }, [works, sortMode, overrideMap]);
}