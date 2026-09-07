import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ChevronDown, ChevronRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

function parseSummary(summaryStr) {
  try { return JSON.parse(summaryStr || '{}'); } catch { return {}; }
}

/**
 * SyncHistorySection — Expandable list of SyncRun records.
 * Shows date, status, processed, updated, ignored, errors.
 * Technical details in expand/collapse.
 */
export default function SyncHistorySection() {
  const [expanded, setExpanded] = useState(null);

  const { data: runs = [], isLoading } = useQuery({
    queryKey: ['sync-runs-history'],
    queryFn: () => base44.entities.SyncRun.list('-started_at', 20),
    staleTime: 30 * 1000,
  });

  if (isLoading) return <div className="text-xs text-muted-foreground animate-pulse">Carregando histórico...</div>;
  if (runs.length === 0) return <div className="text-xs text-muted-foreground">Nenhuma atualização registrada ainda.</div>;

  return (
    <div className="space-y-1.5">
      {runs.map(run => {
        const summary = parseSummary(run.summary);
        const isExpanded = expanded === run.id;
        const status = run.status;
        const statusColor = status === 'completed' ? 'text-primary' : status === 'failed' ? 'text-destructive' : 'text-chart-4';
        const StatusIcon = status === 'completed' ? CheckCircle2 : status === 'failed' ? AlertCircle : Loader2;

        return (
          <div key={run.id} className="bg-secondary/30 rounded-lg border border-border/50 overflow-hidden">
            <button
              onClick={() => setExpanded(isExpanded ? null : run.id)}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-secondary/50 transition-colors"
            >
              <StatusIcon className={`w-4 h-4 shrink-0 ${statusColor} ${status === 'running' ? 'animate-spin' : ''}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{run.dry_run ? 'Simulação' : 'Atualização'}</span>
                  <span className={`text-xs ${statusColor}`}>{status}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {run.started_at ? new Date(run.started_at).toLocaleString('pt-BR') : '—'}
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs shrink-0">
                <div className="text-center">
                  <p className="font-bold text-foreground">{run.total_releases || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Processados</p>
                </div>
                <div className="text-center hidden sm:block">
                  <p className="font-bold text-primary">{summary.sync_safe || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Atualizados</p>
                </div>
                <div className="text-center hidden sm:block">
                  <p className="font-bold text-muted-foreground">{summary.no_changes || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Ignorados</p>
                </div>
                <div className="text-center hidden sm:block">
                  <p className="font-bold text-destructive">{summary.errors || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Erros</p>
                </div>
              </div>
              {isExpanded
                ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
            </button>

            {isExpanded && (
              <div className="px-3 pb-3 pt-1 border-t border-border/30 space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div><span className="text-muted-foreground">Sync safe:</span> <span className="text-primary font-medium">{summary.sync_safe || 0}</span></div>
                  <div><span className="text-muted-foreground">Sem mudanças:</span> <span className="font-medium">{summary.no_changes || 0}</span></div>
                  <div><span className="text-muted-foreground">Review:</span> <span className="text-chart-4 font-medium">{summary.review_required || 0}</span></div>
                  <div><span className="text-muted-foreground">ID mismatch:</span> <span className="text-chart-4 font-medium">{summary.id_mismatch || 0}</span></div>
                  <div><span className="text-muted-foreground">Not found:</span> <span className="text-destructive font-medium">{summary.not_found || 0}</span></div>
                  <div><span className="text-muted-foreground">Missing mapping:</span> <span className="font-medium">{summary.missing_mapping || 0}</span></div>
                  <div><span className="text-muted-foreground">Skipped frozen:</span> <span className="font-medium">{summary.skipped_frozen || 0}</span></div>
                  <div><span className="text-muted-foreground">Skipped override:</span> <span className="font-medium">{summary.skipped_override || 0}</span></div>
                </div>
                {run.errors && run.errors !== '[]' && (
                  <div className="text-xs text-destructive bg-destructive/5 rounded p-2">
                    <p className="font-medium mb-1">Erros:</p>
                    <pre className="text-[10px] overflow-x-auto whitespace-pre-wrap">{run.errors}</pre>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">Run ID: {run.run_id}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}