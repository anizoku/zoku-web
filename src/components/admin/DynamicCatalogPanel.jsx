import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download, Loader2, CheckCircle2, AlertCircle, Clock, Zap } from "lucide-react";
import { importTopWorks, syncCurrentlyAiring, discoverNewSeason, importTopWorksBothSources } from "@/lib/catalogAutoSync";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCatalog } from "@/contexts/CatalogContext";
import { isCategoryFrozen, ANIME_ONLY_MODE, hasActiveCategory } from "@/lib/scopeConfig";

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
  const [importedWorks, setImportedWorks] = useState([]);
  const abortRef = useRef(false);
  const { refreshCatalog } = useCatalog();
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ["dynamic-catalog-stats"],
    queryFn: async () => {
      const works = await base44.entities.DynamicWork.list("popularity_rank", 5000);
      const activeWorks = works.filter(w => {
        const cats = typeof w.categories === 'string' ? JSON.parse(w.categories || '[]') : (w.categories || []);
        return hasActiveCategory(cats);
      }).length;
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

  async function handleImportAnimes() {
    setRunning(true);
    setLogs([]);
    setProgress(0);
    setImportedWorks([]);
    abortRef.current = false;

    addLog("Iniciando importação de Top 500 Animes...", "info");
    const result = await importTopWorks("anime", 20, addLog, setProgress, abortRef);

    addLog(`✓ Importação concluída: +${result.added} animes, ${result.skipped} pulados`, "success");
    setImportedWorks(result.works || []);
    refreshCatalog();
    queryClient.invalidateQueries({ queryKey: ["dynamic-catalog-stats"] });
    setRunning(false);
  }

  async function handleImportMangas() {
    if (isCategoryFrozen("manga")) {
      addLog("CATEGORY_FROZEN: Manga está congelada — importação bloqueada (0 API calls, 0 writes).", "warn");
      return;
    }
    setRunning(true);
    setLogs([]);
    setProgress(0);
    setImportedWorks([]);
    abortRef.current = false;

    addLog("Iniciando importação de Top 500 Mangás...", "info");
    const result = await importTopWorks("manga", 20, addLog, setProgress, abortRef);

    addLog(`✓ Importação concluída: +${result.added} mangás, ${result.skipped} pulados`, "success");
    setImportedWorks(result.works || []);
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

  async function handleImportBothSources() {
    setRunning(true);
    setLogs([]);
    setProgress(0);
    setImportedWorks([]);
    abortRef.current = false;

    addLog("Iniciando importação híbrida (Jikan + TMDB)...", "info");
    const result = await importTopWorksBothSources("anime", 20, addLog, setProgress, abortRef);

    addLog(`✓ Importação concluída: +${result.added} obras, ${result.skipped} puladas`, "success");
    setImportedWorks(result.works || []);
    refreshCatalog();
    queryClient.invalidateQueries({ queryKey: ["dynamic-catalog-stats"] });
    setRunning(false);
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4">
      <div>
        <h3 className="font-space font-bold text-base text-foreground">Catálogo de Anime</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Total: {stats?.total || 0} obras · Última atualização: {stats?.lastSync} · Fonte: MAL/Jikan
        </p>
      </div>

      {/* Ações principais */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">Ações principais</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleImportAnimes} disabled={running} className="gap-2 bg-primary">
            <Download className="w-4 h-4" />
            Importar animes populares
          </Button>
          <Button size="sm" variant="secondary" onClick={handleSyncCurrently} disabled={running} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Sincronizar animes em exibição
          </Button>
          <Button size="sm" variant="outline" onClick={handleDiscoverSeason} disabled={running} className="gap-2">
            <Clock className="w-4 h-4" />
            Buscar próxima temporada
          </Button>
        </div>
      </div>

      {/* Ferramentas avançadas (ocultas durante ANIME_ONLY) */}
      {!ANIME_ONLY_MODE && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Ferramentas avançadas</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={handleImportMangas} disabled={running || isCategoryFrozen("manga")} className="gap-2">
              <Download className="w-4 h-4" />
              Importar mangás populares
              {isCategoryFrozen("manga") && (
                <span className="text-[9px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded font-bold">FROZEN</span>
              )}
            </Button>
            <Button size="sm" variant="secondary" onClick={handleImportBothSources} disabled={running} className="gap-2">
              <Zap className="w-4 h-4" />
              Importação híbrida (Jikan + TMDB)
            </Button>
          </div>
        </div>
      )}

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

      {/* Lista de obras importadas */}
      {importedWorks.length > 0 && !running && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-primary">✓ Obras Importadas ({importedWorks.length})</p>
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 max-h-64 overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {importedWorks.map((work, i) => (
                <div key={i} className="text-xs bg-card/60 rounded px-2 py-1.5 border border-border/50 hover:border-primary/30 transition-all">
                  <p className="font-medium text-foreground truncate">{work.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {work.categories?.map((cat, j) => (
                      <span key={j} className="inline-block px-1.5 py-0.5 rounded text-[9px] bg-secondary text-muted-foreground">
                        {cat === "anime" ? "Anime" : cat === "manga" ? "Mangá" : cat === "movie" ? "Filme" : cat}
                      </span>
                    ))}
                    {work.score && <span className="text-chart-4 font-semibold ml-auto">★ {work.score}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}