import { Snowflake, CheckCircle2 } from "lucide-react";
import { ACTIVE_CATEGORIES, FROZEN_CATEGORIES, CATEGORY_DEFINITIONS, ANIME_ONLY_MODE } from "@/lib/scopeConfig";

/**
 * AdminScopeStatus — small informational banner showing the current category scope.
 * Read-only. Does NOT allow changing ACTIVE_CATEGORIES.
 */
export default function AdminScopeStatus() {
  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${ANIME_ONLY_MODE ? "bg-primary" : "bg-chart-2"}`} />
        <h3 className="font-space font-bold text-sm text-foreground">
          Modo atual: <span className="text-primary">{ANIME_ONLY_MODE ? "ANIME ONLY" : "Multi-categoria"}</span>
        </h3>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3 text-primary" />
          <span className="text-muted-foreground">Ativo:</span>
          <span className="text-primary font-medium">
            {ACTIVE_CATEGORIES.map((c) => CATEGORY_DEFINITIONS[c] || c).join(", ")}
          </span>
        </div>
        {FROZEN_CATEGORIES.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Snowflake className="w-3 h-3 text-destructive/70" />
            <span className="text-muted-foreground">Congelado:</span>
            <span className="text-destructive/80 font-medium">
              {FROZEN_CATEGORIES.map((c) => CATEGORY_DEFINITIONS[c] || c).join(", ")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}