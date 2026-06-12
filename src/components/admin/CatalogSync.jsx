import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, AlertCircle, Loader2, Info, BookOpen, Layers, Clock } from "lucide-react";
import { CATALOG } from "@/lib/catalog";
import { syncWorkFromJikan, syncAllMangas, delay } from "@/lib/jikan";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

function getAnimeSyncableWorks() {
  return CATALOG.filter((w) => {
    if (w.sync_status === "manual_override") return false;
    return w.categories?.includes("anime") && w.animeStatus === "Em exibição";
  });
}

function LogLine({ log }) {
  const color =
    log.type === "success" ? "text-primary" :
    log.type === "error"   ? "text-destructive" :
    log.type === "warn"    ? "text-chart-4" :
    log.type === "loading" ? "text-muted-foreground animate-pulse" :
    log.type === "sep"     ? "text-accent border-t border-border pt-1 mt-1" :
    "text-muted-foreground";

  return (
    <div className={`flex items-start gap-2 ${color}`}>
      {log.type === "success" && <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />}
      {log.type === "error"   && <AlertCircle  className="w-3 h-3 mt-0.5 shrink-0" />}
      {log.type === "loading" && <Loader2      className="w-3 h-3 mt-0.5 shrink-0 animate-spin" />}
      {(log.type === "info" || log.type === "warn" || log.type === "sep") && <Info className="w-3 h-3 mt-0.5 shrink-0" />}
      <span>{log.message}</span>
    </div>
  );
}

function SummaryBar({ summary }) {
  if (!summary) return null;
  return (
    <div className="bg-secondary/40 rounded-lg p-3 grid grid-cols-4 gap-3 text-center">
      <div><p className="font-bold text-foreground text-sm">{summary.total}</p><p className="text-[10px] text-muted-foreground">Total</p></div>
      <div><p className="font-bold text-primary text-sm">{summary.updated}</p><p className="text-[10px] text-muted-foreground">Atualizadas</p></div>
      <div><p className="font-bold text-muted-foreground text-sm">{summary.unchanged}</p><p className="text-[10px] text-muted-foreground">Sem alteração</p></div>
      <div><p className="font-bold text-chart-4 text-sm">{summary.notFound}</p><p className="text-[10px] text-muted-foreground">Não encontradas</p></div>
    </div>
  );
}

function SyncStatusTable() {
  const { data: records = [], isLoading } = useQuery({
    queryKey: ["catalog-sync-records"],
    queryFn: () => base44.entities.CatalogSync.list("-synced_at", 100),
    staleTime: 30 * 1000,
  });

  if (isLoading) return <div className="text-xs text-muted-foreground animate-pulse">Carregando registros...</div>;
  if (records.length === 0) return <div className="text-xs text-muted-foreground">Nenhuma obra sincronizada ainda.</div>;

  // Mostrar apenas as 10 mais recentes
  const recent = records.slice(0, 10);

  return (
    <div className="space-y-1">
      {recent.map((r) => (
        <div key={r.id} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              r.sync_status === "synced" ? "bg-primary" :
              r.sync_status === "manual_override" ? "bg-chart-4" : "bg-muted-foreground"
            }`} />
            <span className="text-foreground font-medium truncate max-w-[140px]">{r.slug}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {r.total_episodes && <span className="text-muted-foreground">{r.total_episodes} eps</span>}
            {r.total_chapters && <span className="text-muted-foreground">{r.total_chapters} caps</span>}
            <span className="text-muted-foreground/70 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {r.synced_at ? new Date(r.synced_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
            </span>
          </div>
        </div>
      ))}
      {records.length > 10 && (
        <p className="text-[10px] text-muted-foreground pt-1">+ {records.length - 10} obras sincronizadas</p>
      )}
    </div>
  );
}

export default function CatalogSync() {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [animeSummary, setAnimeSummary] = useState(null);
  const [mangaSummary, setMangaSummary] = useState(null);
  const abortRef = useRef(false);

  function addLog(message, type = "info") {
    setLogs((prev) => [...prev, { message, type, ts: Date.now() }]);
  }

  // ── Sync animes ─────────────────────────────────────────────────────────
  async function runAnimeSync() {
    const works = getAnimeSyncableWorks();
    let updated = 0, unchanged = 0, notFound = 0;

    addLog(`Sincronizando ${works.length} anime(s) em exibição...`, "info");

    for (let i = 0; i < works.length; i++) {
      if (abortRef.current) break;
      const work = works[i];
      addLog(`[${i + 1}/${works.length}] ${work.title}...`, "loading");

      try {
        const result = await syncWorkFromJikan(work);
        if (!result || result.totalEpisodes == null) {
          addLog(`${work.title}: não encontrado no Jikan`, "warn");
          notFound++;
        } else {
          const changes = [];
          if (result.totalEpisodes !== work.totalEpisodes) changes.push(`Eps: ${work.totalEpisodes} → ${result.totalEpisodes}`);
          if (result.animeStatus && result.animeStatus !== work.animeStatus) changes.push(`Status: ${result.animeStatus}`);
          if (changes.length > 0) { addLog(`${work.title}: atualizado (${changes.join(", ")})`, "success"); updated++; }
          else { addLog(`${work.title}: sem alterações`, "info"); unchanged++; }
        }
      } catch (err) {
        addLog(`${work.title}: erro — ${err.message}`, "error");
        notFound++;
      }

      if (i < works.length - 1) await delay(450);
    }

    const summary = { total: works.length, updated, unchanged, notFound };
    setAnimeSummary(summary);
    return summary;
  }

  // ── Sync mangás ─────────────────────────────────────────────────────────
  async function runMangaSync() {
    return syncAllMangas(
      CATALOG,
      (msg, type) => addLog(msg, type),
      null,
      abortRef,
    ).then((summary) => { setMangaSummary(summary); return summary; });
  }

  // ── Handlers ────────────────────────────────────────────────────────────
  async function handleSyncAnimes() {
    setRunning(true); setLogs([]); setAnimeSummary(null); setMangaSummary(null);
    abortRef.current = false;
    await runAnimeSync();
    setRunning(false);
  }

  async function handleSyncMangas() {
    setRunning(true); setLogs([]); setAnimeSummary(null); setMangaSummary(null);
    abortRef.current = false;
    await runMangaSync();
    setRunning(false);
  }

  async function handleSyncAll() {
    setRunning(true); setLogs([]); setAnimeSummary(null); setMangaSummary(null);
    abortRef.current = false;

    addLog("═══ FASE 1 — ANIMES ═══", "sep");
    await runAnimeSync();
    if (!abortRef.current) {
      addLog("═══ FASE 2 — MANGÁS ═══", "sep");
      await delay(600);
      await runMangaSync();
    }
    addLog("Sincronização completa!", "success");
    setRunning(false);
  }

  function handleAbort() {
    abortRef.current = true;
    setRunning(false);
    addLog("Sincronização interrompida pelo usuário.", "warn");
  }

  const animeCount = getAnimeSyncableWorks().length;

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4">
      <div>
        <h3 className="font-space font-bold text-base text-foreground">Sincronização do Catálogo (Jikan/MAL)</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {animeCount} anime(s) em exibição · dados via{" "}
          <a href="https://jikan.moe" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Jikan API</a>
        </p>
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap gap-2">
        {running ? (
          <Button variant="outline" size="sm" onClick={handleAbort} className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10">
            Parar
          </Button>
        ) : (
          <>
            <Button size="sm" onClick={handleSyncAnimes} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <RefreshCw className="w-4 h-4" />
              Sincronizar animes
            </Button>
            <Button size="sm" variant="outline" onClick={handleSyncMangas} className="gap-2">
              <BookOpen className="w-4 h-4" />
              Sincronizar mangás
            </Button>
            <Button size="sm" variant="secondary" onClick={handleSyncAll} className="gap-2">
              <Layers className="w-4 h-4" />
              Sincronizar tudo
            </Button>
          </>
        )}
      </div>

      {/* Log area */}
      {logs.length > 0 && (
        <div className="bg-input rounded-lg border border-border p-3 max-h-72 overflow-y-auto space-y-1 font-mono text-xs">
          {logs.map((log, i) => <LogLine key={i} log={log} />)}
          {running && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin shrink-0" />
              <span>Processando...</span>
            </div>
          )}
        </div>
      )}

      {/* Summaries */}
      {animeSummary && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1">Resultado — Animes</p>
          <SummaryBar summary={animeSummary} />
        </div>
      )}
      {mangaSummary && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1">Resultado — Mangás</p>
          <SummaryBar summary={mangaSummary} />
        </div>
      )}

      {/* Última sincronização */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
          <Clock className="w-3 h-3" /> Última sincronização (recentes)
        </p>
        <SyncStatusTable />
      </div>

      <p className="text-[10px] text-muted-foreground">
        ✅ Dados sincronizados são persistidos no banco e mesclados automaticamente com o catálogo.
      </p>
    </div>
  );
}