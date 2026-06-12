import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, AlertCircle, Loader2, Info } from "lucide-react";
import { CATALOG } from "@/lib/catalog";
import { syncWorkFromJikan, delay } from "@/lib/jikan";

// Works that should be synced: have anime "Em exibição" or manga "Em publicação"
function getSyncableWorks() {
  return CATALOG.filter((w) => {
    if (w.sync_status === "manual_override") return false;
    const animeActive = w.categories?.includes("anime") && w.animeStatus === "Em exibição";
    const mangaActive = w.categories?.includes("manga") && w.mangaStatus === "Em publicação";
    return animeActive || mangaActive;
  });
}

export default function CatalogSync() {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const abortRef = useRef(false);

  function addLog(slug, message, type = "info") {
    setLogs((prev) => [...prev, { slug, message, type, ts: Date.now() }]);
  }

  async function handleSync() {
    setRunning(true);
    setLogs([]);
    setSummary(null);
    abortRef.current = false;

    const works = getSyncableWorks();
    let updated = 0;
    let unchanged = 0;
    let notFound = 0;

    addLog("sistema", `Iniciando sincronização de ${works.length} obra(s) em exibição/publicação...`, "info");

    for (let i = 0; i < works.length; i++) {
      if (abortRef.current) break;
      const work = works[i];
      addLog(work.slug, `[${i + 1}/${works.length}] Sincronizando: ${work.title}...`, "loading");

      try {
        const result = await syncWorkFromJikan(work);

        if (!result || (result.totalEpisodes == null && result.totalChapters == null)) {
          addLog(work.slug, `${work.title}: não encontrada no Jikan — mantendo dados atuais`, "warn");
          notFound++;
        } else {
          const changes = [];
          if (result.totalEpisodes != null && result.totalEpisodes !== work.totalEpisodes) {
            changes.push(`Eps: ${work.totalEpisodes} → ${result.totalEpisodes}`);
          }
          if (result.totalChapters != null && result.totalChapters !== work.totalChapters) {
            changes.push(`Caps: ${work.totalChapters} → ${result.totalChapters}`);
          }

          if (changes.length > 0) {
            addLog(work.slug, `${work.title}: atualizado (${changes.join(", ")})`, "success");
            updated++;
          } else {
            addLog(work.slug, `${work.title}: sem alterações`, "info");
            unchanged++;
          }
        }
      } catch (err) {
        addLog(work.slug, `${work.title}: erro — ${err.message}`, "error");
        notFound++;
      }

      // Rate limit: 1 req/s
      if (i < works.length - 1) await delay(1100);
    }

    setSummary({ total: works.length, updated, unchanged, notFound });
    setRunning(false);
  }

  function handleAbort() {
    abortRef.current = true;
    setRunning(false);
    addLog("sistema", "Sincronização interrompida pelo usuário.", "warn");
  }

  const syncableCount = getSyncableWorks().length;

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-space font-bold text-base text-foreground">Sincronização do Catálogo (Jikan/MAL)</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {syncableCount} obra(s) em exibição/publicação · dados via{" "}
            <a href="https://jikan.moe" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Jikan API</a>
          </p>
        </div>
        <div className="flex gap-2">
          {running ? (
            <Button variant="outline" size="sm" onClick={handleAbort} className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10">
              Parar
            </Button>
          ) : (
            <Button size="sm" onClick={handleSync} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <RefreshCw className="w-4 h-4" />
              Sincronizar catálogo
            </Button>
          )}
        </div>
      </div>

      {/* Log area */}
      {logs.length > 0 && (
        <div className="bg-input rounded-lg border border-border p-3 max-h-64 overflow-y-auto space-y-1 font-mono text-xs">
          {logs.map((log, i) => (
            <div key={i} className={`flex items-start gap-2 ${
              log.type === "success" ? "text-primary" :
              log.type === "error" ? "text-destructive" :
              log.type === "warn" ? "text-chart-4" :
              log.type === "loading" ? "text-muted-foreground animate-pulse" :
              "text-muted-foreground"
            }`}>
              {log.type === "success" && <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />}
              {log.type === "error" && <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />}
              {log.type === "loading" && <Loader2 className="w-3 h-3 mt-0.5 shrink-0 animate-spin" />}
              {(log.type === "info" || log.type === "warn") && <Info className="w-3 h-3 mt-0.5 shrink-0" />}
              <span>{log.message}</span>
            </div>
          ))}
          {running && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin shrink-0" />
              <span>Processando...</span>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="bg-secondary/40 rounded-lg p-3 grid grid-cols-4 gap-3 text-center">
          <div>
            <p className="font-bold text-foreground text-sm">{summary.total}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
          <div>
            <p className="font-bold text-primary text-sm">{summary.updated}</p>
            <p className="text-[10px] text-muted-foreground">Atualizadas</p>
          </div>
          <div>
            <p className="font-bold text-muted-foreground text-sm">{summary.unchanged}</p>
            <p className="text-[10px] text-muted-foreground">Sem alteração</p>
          </div>
          <div>
            <p className="font-bold text-chart-4 text-sm">{summary.notFound}</p>
            <p className="text-[10px] text-muted-foreground">Não encontradas</p>
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        ⚠️ Esta sincronização atualiza apenas o log em tempo real. Para persistir alterações no catálogo, o admin deve editar manualmente via CardOverride as obras encontradas com dados desatualizados.
      </p>
    </div>
  );
}