import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Clock, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { syncCurrentlyAiring, discoverNewSeason } from "@/lib/catalogAutoSync";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCatalog } from "@/contexts/CatalogContext";
import { hasActiveCategory } from "@/lib/scopeConfig";
import SyncHistorySection from "./SyncHistorySection";

function parseCategories(work) {
  if (!work.categories) return [];
  if (Array.isArray(work.categories)) return work.categories;
  try { return JSON.parse(work.categories); } catch { return []; }
}

function LogLine({ log }) {
  const color =
    log.type === "success" ? "text-primary" :
    log.type === "error" ? "text-destructive" :
    log.type === "warn" ? "text-chart-4" : "text-muted-foreground";
  return (
    <div className={`text-xs ${color} flex items-start gap-2`}>
      {log.type === "success" && <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />}
      {log.type === "error" && <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />}
      <span>{log.message}</span>
    </div>
  );
}

/**
 * CatalogUpdatePanel — Goal-oriented sync actions + update history.
 * Primary actions: sync currently airing + discover next season.
 * Import actions are in CatalogAdvancedPanel.
 */
export default function CatalogUpdatePanel() {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const abortRef = useRef(false);
  const { refreshCatalog } = useCatalog();
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ["catalog-update-stats"],
    queryFn: async () => {
      const works = await base44.entities.DynamicWork.list("popularity_rank", 5000);
      const activeWorks = works.filter(w => hasActiveCategory(parseCategories(w))).length;
      const lastSync = localStorage.getItem("zoku_last_auto_sync");
      return {
        total: activeWorks,
        lastSync: lastSync ? new Date(parseInt(lastSync)).toLocaleString("pt-BR") : "Nunca",
      };
    },
    staleTime: 60 * 1000,
  });

  function addLog(msg, type = "info") {
    setLogs((prev) => [...prev, { message: msg, type }]);
  }

  async function handleSyncCurrently() {
    setRunning(true); setLogs([]); abortRef.current = false;
    addLog("Sincronizando obras em exibição...", "info");
    const result = await syncCurrentlyAiring(addLog);
    addLog(`✓ +${result.added} novas, ${result.updated} atualizadas`, "success");
    refreshCatalog();
    localStorage.setItem("zoku_last_auto_sync", Date.now().toString());
    queryClient.invalidateQueries({ queryKey: ["catalog-update-stats"] });
    setRunning(false);
  }

  async function handleDiscoverSeason() {
    setRunning(true); setLogs([]); abortRef.current = false;
    addLog("Descobrindo obras da próxima temporada...", "info");
    const result = await discoverNewSeason(addLog);
    addLog(`✓ ${result.newCount} obras adicionadas`, "success");
    refreshCatalog();
    queryClient.invalidateQueries({ queryKey: ["catalog-update-stats"] });
    setRunning(false);
  }

  function handleAbort() {
    abortRef.current = true;
    setRunning(false);
    addLog("Operação interrompida.", "warn");
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div>
          <h3 className="font-space font-bold text-base text-foreground">Atualização do catálogo</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {stats?.total || 0} animes ativos · Última atualização: {stats?.lastSync}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleSyncCurrently} disabled={running} className="gap-2 bg-primary">
            <RefreshCw className="w-4 h-4" />
            Sincronizar animes atuais
          </Button>
          <Button size="sm" variant="outline" onClick={handleDiscoverSeason} disabled={running} className="gap-2">
            <Clock className="w-4 h-4" />
            Buscar próxima temporada
          </Button>
          {running && (
            <Button size="sm" variant="outline" onClick={handleAbort} className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10">
              Parar
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Verifica status, episódios e novas temporadas.</p>
        <p className="text-[10px] text-muted-foreground/70">Detalhes: Fonte MAL/Jikan</p>
      </div>

      {/* Logs */}
      {logs.length > 0 && (
        <div className="bg-input rounded-lg border border-border p-3 max-h-48 overflow-y-auto space-y-1">
          {logs.map((log, i) => <LogLine key={i} log={log} />)}
          {running && (
            <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="text-xs">Processando...</span>
            </div>
          )}
        </div>
      )}

      {/* History */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-space font-bold text-sm text-foreground mb-4">Histórico de atualizações</h3>
        <SyncHistorySection />
      </div>
    </div>
  );
}