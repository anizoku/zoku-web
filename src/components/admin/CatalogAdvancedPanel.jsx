import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, CheckCircle2, AlertCircle, Zap } from "lucide-react";
import { importTopWorks, importTopWorksBothSources } from "@/lib/catalogAutoSync";
import { useQueryClient } from "@tanstack/react-query";
import { useCatalog } from "@/contexts/CatalogContext";
import { ANIME_ONLY_MODE } from "@/lib/scopeConfig";
import FranchiseMerger from "./FranchiseMerger";

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
 * CatalogAdvancedPanel — Mass import + franchise unification.
 * These tools alter catalog structure. Confirmation dialogs are handled
 * within FranchiseMerger. Import actions show progress + logs.
 */
export default function CatalogAdvancedPanel() {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(0);
  const [importedWorks, setImportedWorks] = useState([]);
  const abortRef = useRef(false);
  const { refreshCatalog } = useCatalog();
  const queryClient = useQueryClient();

  function addLog(msg, type = "info") {
    setLogs((prev) => [...prev, { message: msg, type }]);
  }

  async function handleImportAnimes() {
    if (!window.confirm("Confirmar importação em massa de animes populares? Esta operação adiciona novas obras ao catálogo.")) return;
    setRunning(true); setLogs([]); setProgress(0); setImportedWorks([]); abortRef.current = false;
    addLog("Iniciando importação de animes populares...", "info");
    const result = await importTopWorks("anime", 20, addLog, setProgress, abortRef);
    addLog(`✓ Importação concluída: +${result.added} animes, ${result.skipped} pulados`, "success");
    setImportedWorks(result.works || []);
    refreshCatalog();
    queryClient.invalidateQueries({ queryKey: ["catalog-update-stats"] });
    setRunning(false);
  }

  async function handleImportBothSources() {
    if (!window.confirm("Confirmar importação híbrida (Jikan + TMDB)? Esta operação adiciona novas obras ao catálogo.")) return;
    setRunning(true); setLogs([]); setProgress(0); setImportedWorks([]); abortRef.current = false;
    addLog("Iniciando importação híbrida...", "info");
    const result = await importTopWorksBothSources("anime", 20, addLog, setProgress, abortRef);
    addLog(`✓ Importação concluída: +${result.added} obras, ${result.skipped} puladas`, "success");
    setImportedWorks(result.works || []);
    refreshCatalog();
    queryClient.invalidateQueries({ queryKey: ["catalog-update-stats"] });
    setRunning(false);
  }

  return (
    <div className="space-y-6">
      {/* Mass import */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div>
          <h3 className="font-space font-bold text-base text-foreground">Importação em massa</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Importa grandes quantidades de obras do catálogo externo.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={handleImportAnimes} disabled={running} className="gap-2">
            <Download className="w-4 h-4" />
            Importar animes populares
          </Button>
          {!ANIME_ONLY_MODE && (
            <Button size="sm" variant="outline" onClick={handleImportBothSources} disabled={running} className="gap-2">
              <Zap className="w-4 h-4" />
              Importação híbrida (Jikan + TMDB)
            </Button>
          )}
        </div>
        {progress > 0 && (
          <div className="space-y-1">
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">{Math.round(progress * 100)}%</p>
          </div>
        )}
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
        {importedWorks.length > 0 && !running && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-primary">✓ Obras Importadas ({importedWorks.length})</p>
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 max-h-64 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {importedWorks.map((work, i) => (
                  <div key={i} className="text-xs bg-card/60 rounded px-2 py-1.5 border border-border/50">
                    <p className="font-medium text-foreground truncate">{work.title}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Franchise unification */}
      <div>
        <h3 className="font-space font-bold text-base text-foreground mb-4">Unificar franquias</h3>
        <FranchiseMerger />
      </div>
    </div>
  );
}