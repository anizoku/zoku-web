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
 * Last update source: SyncRun (persisted), NOT localStorage.
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
      return { total: activeWorks };
    },
    staleTime: 60 * 1000,
  });

  // Persisted last sync (SyncRun is the source of truth, NOT localStorage)
  const { data: syncRuns = [] } = useQuery({
    queryKey: ["catalog-last-sync-run"],
    queryFn: () => base44.entities.SyncRun.list('-started_at', 1),
    staleTime: 30 * 1000,
  });

  const lastRun = syncRuns[0];
  const lastSyncDate = lastRun?.started_at
    ? new Date(lastRun.started_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : 'Nunca';
  const lastSyncStatus = lastRun?.status || '—';

  function addLog(msg, type = "info") {
    setLogs((prev) => [...prev, { message: msg, type }]);
  }

  async function handleSyncCurrently() {
    setRunning(true); setLogs([]); abortRef.current = false;
    addLog("Sincronizando obras em exibição...", "info");
    const result = await syncCurrentlyAiring(addLog);
    addLog(`✓ +${result.added} novas, ${result.updated} atualizadas`, "success");
    refreshCatalog();
    // Legacy localStorage kept for backward compat, NOT used as display source
    localStorage.setItem("zoku_last_auto_sync", Date.now().toString());
    queryClient.invalidateQueries({ queryKey: ["catalog-last-sync-run"] });
    queryClient.invalidateQueries({ queryKey: ["catalog-update-stats"] });
    setRunning(false);
  }

  async function handleDiscoverSeason() {
    setRunning(true); setLogs([]); abortRef.current = false;
    addLog("Descobrindo obras da próxima temporada...", "info");
    const result = await discoverNewSeason(addLog);
    addLog(`✓ ${result.newCount} obras adicionadas`, "success");
    refreshCatalog();
    queryClient.invalidateQueries({ queryKey: ["catalog-last-sync-run"] });
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
            {stats?.total || 0} animes ativos · Última atualização: {lastSyncDate} ({lastSyncStatus})
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