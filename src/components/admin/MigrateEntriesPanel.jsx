import { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CATALOG } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Info, Loader2, Wrench } from "lucide-react";
import { isCategoryActive } from "@/lib/scopeConfig";

// ── helpers ─────────────────────────────────────────────────────
function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Normaliza título para comparação */
function norm(s) {
  return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/** Encontra o item no catálogo pelo título (case/accent-insensitive) */
function findCatalogItem(title) {
  const t = norm(title);
  return CATALOG.find((c) => norm(c.title) === t) || null;
}

/** Retorna o total de episódios/capítulos do catálogo para um entry */
function getCatalogTotal(entry, catalogItem) {
  if (!catalogItem) return 0;
  const fmt = entry.genre?.startsWith("__format:") ? entry.genre.replace("__format:", "") : null;
  const isManga = fmt === "manga" || entry.type === "manga";
  if (isManga) return catalogItem.totalChapters || 0;
  return catalogItem.totalEpisodes || 0;
}

/** Verifica se o entry precisa de correção */
function needsFix(entry) {
  if (entry.status !== "completed") return false;
  const fmt = entry.genre?.startsWith("__format:") ? entry.genre.replace("__format:", "") : null;
  const isManga = fmt === "manga" || entry.type === "manga";
  const isMovie = fmt === "movie" || entry.type === "movie";
  if (isMovie) return false; // filmes não têm episódios
  const progress = isManga ? (entry.current_chapter || 0) : (entry.current_episode || 0);
  return progress === 0;
}

/** Determina a categoria de um entry para fins de freeze */
function entryCategory(entry) {
  if (entry.type === "manga") return "manga";
  // AnimeEntry.type só é "anime" ou "manga"; format=MOVIE em anime continua ativo
  return "anime";
}

/** Verifica se o entry pertence a uma categoria ativa (não congelada) */
function isEntryActive(entry) {
  return isCategoryActive(entryCategory(entry));
}

// ── LogLine (igual ao CatalogSync) ─────────────────────────────
function LogLine({ log }) {
  const color =
    log.type === "success" ? "text-primary" :
    log.type === "error"   ? "text-destructive" :
    log.type === "warn"    ? "text-chart-4" :
    log.type === "loading" ? "text-muted-foreground animate-pulse" :
    "text-muted-foreground";

  return (
    <div className={`flex items-start gap-2 ${color}`}>
      {log.type === "success" && <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />}
      {log.type === "error"   && <AlertCircle  className="w-3 h-3 mt-0.5 shrink-0" />}
      {log.type === "loading" && <Loader2      className="w-3 h-3 mt-0.5 shrink-0 animate-spin" />}
      {(log.type === "info" || log.type === "warn") && <Info className="w-3 h-3 mt-0.5 shrink-0" />}
      <span>{log.message}</span>
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────
export default function MigrateEntriesPanel() {
  const [running, setRunning]     = useState(false);
  const [logs, setLogs]           = useState([]);
  const [summary, setSummary]     = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const abortRef = useRef(false);

  function addLog(message, type = "info") {
    setLogs((prev) => [...prev, { message, type, ts: Date.now() }]);
  }

  async function runMigration() {
    setRunning(true);
    setLogs([]);
    setSummary(null);
    abortRef.current = false;
    setShowConfirm(false);

    addLog("Buscando todas as entradas concluídas...", "loading");

    // Fetch all entries (paginate se necessário — máx 1000 por chamada)
    let allEntries = [];
    try {
      allEntries = await base44.entities.AnimeEntry.list("-updated_date", 1000);
    } catch (e) {
      addLog(`Erro ao buscar entradas: ${e.message}`, "error");
      setRunning(false);
      return;
    }

    const completed = allEntries.filter((e) => e.status === "completed");
    const allToFix  = completed.filter(needsFix);

    // ── FREEZE GUARD: separar entries de categorias congeladas ──────
    const frozenEntries = allToFix.filter((e) => !isEntryActive(e));
    const toFix         = allToFix.filter((e) => isEntryActive(e));

    addLog(`Total concluídas encontradas: ${completed.length}`, "info");
    addLog(`Entradas que precisam de correção: ${toFix.length}`, toFix.length > 0 ? "warn" : "success");
    if (frozenEntries.length > 0) {
      addLog(`${frozenEntries.length} entrada(s) congelada(s) ignorada(s) — preservadas, sem alteração.`, "warn");
    }

    if (toFix.length === 0) {
      addLog("Nenhuma entrada ativa precisa ser corrigida. ✓", "success");
      setSummary({ total: completed.length, fixed: 0, skipped: 0, errors: 0, frozen: frozenEntries.length });
      setRunning(false);
      return;
    }

    let fixed = 0, skipped = 0, errors = 0;

    for (let i = 0; i < toFix.length; i++) {
      if (abortRef.current) {
        addLog("Migração interrompida.", "warn");
        break;
      }

      const entry = toFix[i];
      const fmt   = entry.genre?.startsWith("__format:") ? entry.genre.replace("__format:", "") : null;
      const isManga = fmt === "manga" || entry.type === "manga";

      addLog(`[${i + 1}/${toFix.length}] ${entry.title} (${isManga ? "mangá" : "anime"})...`, "loading");

      const catalogItem = findCatalogItem(entry.title);
      const catalogTotal = getCatalogTotal(entry, catalogItem);

      if (catalogTotal <= 0) {
        addLog(`  ↳ Catálogo sem total para "${entry.title}" — pulando`, "warn");
        skipped++;
        continue;
      }

      const field      = isManga ? "current_chapter"  : "current_episode";
      const totalField = isManga ? "total_chapters"    : "total_episodes";

      try {
        await base44.entities.AnimeEntry.update(entry.id, {
          [field]:      catalogTotal,
          [totalField]: catalogTotal,
        });
        addLog(`  ↳ Corrigido: ${isManga ? "Cap." : "Ep."} 0 → ${catalogTotal}`, "success");
        fixed++;
      } catch (e) {
        addLog(`  ↳ Erro ao atualizar: ${e.message}`, "error");
        errors++;
      }

      if (i < toFix.length - 1) await delay(200);
    }

    const finalSummary = { total: completed.length, fixed, skipped, errors, frozen: frozenEntries.length };
    setSummary(finalSummary);
    addLog(
      `Migração concluída! ${fixed} corrigidas · ${skipped} puladas · ${errors} erros${frozenEntries.length > 0 ? ` · ${frozenEntries.length} congeladas ignoradas` : ""}`,
      errors > 0 ? "warn" : "success"
    );
    setRunning(false);
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4">
      <div>
        <h3 className="font-space font-bold text-base text-foreground flex items-center gap-2">
          <Wrench className="w-4 h-4 text-chart-4" />
          Corrigir entradas concluídas
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Detecta todas as entradas marcadas como "Concluído" com episódios/capítulos zerados e preenche o valor correto a partir do catálogo.
        </p>
      </div>

      {/* Aviso */}
      {!running && !summary && (
        <div className="flex items-start gap-2 bg-chart-4/10 border border-chart-4/30 rounded-lg px-3 py-2.5">
          <AlertCircle className="w-4 h-4 text-chart-4 shrink-0 mt-0.5" />
          <p className="text-xs text-chart-4">
            Esta ação irá atualizar todas as entradas marcadas como concluídas com episódios zerados.
            <strong className="font-semibold"> Esta operação não pode ser desfeita.</strong>
          </p>
        </div>
      )}

      {/* Botões */}
      <div className="flex flex-wrap gap-2">
        {running ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => { abortRef.current = true; }}
            className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
          >
            Parar
          </Button>
        ) : !showConfirm ? (
          <Button
            size="sm"
            onClick={() => setShowConfirm(true)}
            className="gap-2 bg-chart-4/90 text-primary-foreground hover:bg-chart-4"
            disabled={running}
          >
            <Wrench className="w-4 h-4" />
            Corrigir entradas concluídas
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-xs text-chart-4 font-medium">Confirmar execução?</p>
            <Button size="sm" variant="destructive" onClick={runMigration} className="gap-1.5">
              Sim, executar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowConfirm(false)}>
              Cancelar
            </Button>
          </div>
        )}
      </div>

      {/* Log em tempo real */}
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

      {/* Sumário final */}
      {summary && (
        <div className="bg-secondary/40 rounded-lg p-3 grid grid-cols-4 md:grid-cols-5 gap-3 text-center">
          <div>
            <p className="font-bold text-foreground text-sm">{summary.total}</p>
            <p className="text-[10px] text-muted-foreground">Concluídas</p>
          </div>
          <div>
            <p className="font-bold text-primary text-sm">{summary.fixed}</p>
            <p className="text-[10px] text-muted-foreground">Corrigidas</p>
          </div>
          <div>
            <p className="font-bold text-muted-foreground text-sm">{summary.skipped}</p>
            <p className="text-[10px] text-muted-foreground">Puladas</p>
          </div>
          <div>
            <p className="font-bold text-destructive text-sm">{summary.errors}</p>
            <p className="text-[10px] text-muted-foreground">Erros</p>
          </div>
          {summary.frozen != null && (
            <div>
              <p className="font-bold text-chart-4 text-sm">{summary.frozen}</p>
              <p className="text-[10px] text-muted-foreground">Congeladas</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}