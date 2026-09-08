import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, CheckCircle2, AlertCircle, Activity, Clock, Layers } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { syncActiveWorkReleases, getActiveReleaseStats } from "@/lib/releaseSync";
import { useCatalog } from "@/contexts/CatalogContext";

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

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-secondary/40 rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        <Icon className="w-3 h-3" />
        <span className="text-[10px]">{label}</span>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}

/**
 * ReleaseSyncPanel — Admin UI for canonical WorkRelease sync (Fase 6A).
 * Shows active release counts, last sync, and structured logs.
 * Triggered manually from Admin → Catálogo → Releases.
 */
export default function ReleaseSyncPanel() {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const abortRef = useRef(false);
  const { refreshCatalog } = useCatalog();
  const queryClient = useQueryClient();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["release-sync-stats"],
    queryFn: getActiveReleaseStats,
    staleTime: 60 * 1000,
  });

  function addLog(msg, type = "info") {
    setLogs((prev) => [...prev, { message: msg, type }]);
  }

  async function handleSyncActive() {
    setRunning(true);
    setLogs([]);
    setSummary(null);
    abortRef.current = false;
    addLog("Iniciando sincronização de releases ativos...", "info");

    const { summary: s } = await syncActiveWorkReleases({
      onLog: addLog,
      dryRun: false,
      abortRef,
    });

    setSummary(s);
    refreshCatalog();
    queryClient.invalidateQueries({ queryKey: ["release-sync-stats"] });
    setRunning(false);
  }

  function handleAbort() {
    abortRef.current = true;
    addLog("Interrompendo após o release atual...", "warn");
  }

  const lastSyncDate = stats?.last_synced_at
    ? new Date(stats.last_synced_at).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
      })
    : "Nunca";

  return (
    <div className="space-y-6">
      {/* Stats + Actions */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div>
          <h3 className="font-space font-bold text-base text-foreground">Sincronização de Releases</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Atualiza WorkRelease com dados de AniList (primário) e MAL/Jikan (fallback)
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Activity} label="Em exibição" value={stats?.releasing ?? "—"} />
          <StatCard icon={Clock} label="Próximos" value={stats?.not_yet_released ?? "—"} />
          <StatCard icon={Layers} label="Total anime" value={stats?.total_anime ?? "—"} />
          <StatCard icon={RefreshCw} label="Último sync" value={lastSyncDate} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={handleSyncActive}
            disabled={running || isLoading}
            className="gap-2 bg-primary"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sincronizar releases ativos
          </Button>
          {running && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleAbort}
              className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              Parar
            </Button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground/70">
          Fonte: AniList (primário) → MAL/Jikan (fallback) · Apenas category=anime ·
          manual_override protegido · episode_count nunca reduzido automaticamente
        </p>
      </div>

      {/* Summary */}
      {summary && (
        <div className="bg-card rounded-xl border border-border p-4">
          <h4 className="font-space font-bold text-sm text-foreground mb-3">Resumo</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-primary" />
              <span className="text-muted-foreground">Atualizados:</span>
              <span className="font-bold text-foreground">{summary.updated}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Sem alterações:</span>
              <span className="font-bold text-foreground">{summary.unchanged}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3 text-chart-4" />
              <span className="text-muted-foreground">Sem mapping:</span>
              <span className="font-bold text-foreground">{summary.no_mapping}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Manual override:</span>
              <span className="font-bold text-foreground">{summary.skipped_override}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3 text-destructive" />
              <span className="text-muted-foreground">Erros:</span>
              <span className="font-bold text-foreground">{summary.errors}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Regressões bloqueadas:</span>
              <span className="font-bold text-foreground">{summary.regression_blocked}</span>
            </div>
          </div>
        </div>
      )}

      {/* Logs */}
      {logs.length > 0 && (
        <div className="bg-input rounded-lg border border-border p-3 max-h-64 overflow-y-auto space-y-1">
          {logs.map((log, i) => (
            <LogLine key={i} log={log} />
          ))}
          {running && (
            <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="text-xs">Processando...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}