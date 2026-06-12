import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download, Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { importTopWorks, syncCurrentlyAiring, discoverNewSeason } from "@/lib/catalogAutoSync";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
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

export default function DynamicCatalogPanel() {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(0);
  const abortRef = useRef(false);
  const { refreshCatalog } = useCatalog();
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ["dynamic-catalog-stats"],
    queryFn: async () => {
      const works = await base44.entities.DynamicWork.list("popularity_rank", 5000);
      const lastSync = localStorage.getItem("zoku_last_auto_sync");
      return {
        total: works.length,
        lastSync: lastSync ? new Date(parseInt(lastSync)).toLocaleString("pt-BR") : "Nunca",
      };
    },
    staleTime: 60 * 1000,
  });

  function addLog(msg, type = "info") {
    setLogs((prev) => [...prev, { message: msg, type }]);
  }

  async function handleImportAnimes() {
    setRunning(true);
    setLogs([]);
    setProgress(0);
    abortRef.current = false;

    addLog("Iniciando importação de Top 500 Animes...", "info");
    const result = await importTopWorks("anime", 20, addLog, setProgress, abortRef);

    addLog(`✓ Importação concluída: +${result.added} animes, ${result.skipped} pulados`, "success");
    refreshCatalog();
    queryClient.invalidateQueries({ queryKey: ["dynamic-catalog-stats"] });
    setRunning(false);
  }

  async function handleImportMangas() {
    setRunning(true);
    setLogs([]);
    setProgress(0);
    abortRef.current = false;

    addLog("Iniciando importação de Top 500 Mangás...", "info");
    const result = await importTopWorks("manga", 20, addLog, setProgress, abortRef);

    addLog(`✓ Importação concluída: +${result.added} mangás, ${result.skipped} pulados`, "success");
    refreshCatalog();
    queryClient.invalidateQueries({ queryKey: ["dynamic-catalog-stats"] });
    setRunning(false);
  }

  async function handleSyncCurrently() {
    setRunning(true);
    setLogs([]);
    abortRef.current = false;

    addLog("Sincronizando obras em exibição...", "info");
    const result = await syncCurrentlyAiring(addLog);

    addLog(`✓ +${result.added} novas, ${result.updated} atualizadas`, "success");
    refreshCatalog();
    localStorage.setItem("zoku_last_auto_sync", Date.now().toString());
    queryClient.invalidateQueries({ queryKey: ["dynamic-catalog-stats"] });
    setRunning(false);
  }

  async function handleDiscoverSeason() {
    setRunning(true);
    setLogs([]);
    abortRef.current = false;

    addLog("Descobrindo obras da próxima temporada...", "info");
    const result = await discoverNewSeason(addLog);

    addLog(`✓ ${result.newCount} obras adicionadas`, "success");
    refreshCatalog();
    queryClient.invalidateQueries({ queryKey: ["dynamic-catalog-stats"] });
    setRunning(false);
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4">
      <div>
        <h3 className="font-space font-bold text-base text-foreground">Catálogo Dinâmico</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Importação automática do Jikan API · Total: {stats?.total || 0} obras · Último sync: {stats?.lastSync}
        </p>
      </div>

      {/* Importação */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">Importação Inicial</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleImportAnimes} disabled={running} className="gap-2 bg-primary">
            <Download className="w-4 h-4" />
            Top 500 Animes
          </Button>
          <Button size="sm" variant="outline" onClick={handleImportMangas} disabled={running} className="gap-2">
            <Download className="w-4 h-4" />
            Top 500 Mangás
          </Button>
        </div>
      </div>

      {/* Auto-sync */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">Sincronização Automática</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={handleSyncCurrently} disabled={running} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Sincronizar Agora
          </Button>
          <Button size="sm" variant="outline" onClick={handleDiscoverSeason} disabled={running} className="gap-2">
            <Clock className="w-4 h-4" />
            Próxima Temporada
          </Button>
        </div>
      </div>

      {/* Progresso */}
      {progress > 0 && (
        <div className="space-y-1">
          <div className="w-full bg-muted rounded-full h-2">
            <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">{Math.round(progress * 100)}%</p>
        </div>
      )}

      {/* Logs */}
      {logs.length > 0 && (
        <div className="bg-input rounded-lg border border-border p-3 max-h-48 overflow-y-auto space-y-1">
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