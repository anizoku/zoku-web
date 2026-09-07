import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Library, GitBranch, MessageSquare, Flag, RefreshCw, ArrowRight, Clock, Activity, AlertTriangle, FileSearch } from "lucide-react";
import { hasActiveCategory, isCategoryActive, ANIME_ONLY_MODE, FROZEN_CATEGORIES, CATEGORY_DEFINITIONS } from "@/lib/scopeConfig";

function parseCategories(work) {
  if (!work.categories) return [];
  if (Array.isArray(work.categories)) return work.categories;
  try { return JSON.parse(work.categories); } catch { return []; }
}

function parseSummary(summaryStr) {
  try { return JSON.parse(summaryStr || '{}'); } catch { return {}; }
}

function StatCard({ icon: Icon, value, label, color }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
          <p className="text-xs text-muted-foreground truncate">{label}</p>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, title, description, onClick, iconColor }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );
}

/**
 * AdminOverview — Dashboard with stat cards, catalog health, and quick actions.
 * Uses existing data (SyncRun, SyncConflict, CatalogSync). No new entities.
 * Last update source: SyncRun (persisted), NOT localStorage.
 * Read-only — no actions execute automatically.
 */
export default function AdminOverview({ onNavigate }) {
  const { data: dynamicWorks = [] } = useQuery({
    queryKey: ['admin-overview-works'],
    queryFn: () => base44.entities.DynamicWork.list('-created_date', 5000),
    staleTime: 60 * 1000,
  });

  const { data: releases = [] } = useQuery({
    queryKey: ['admin-overview-releases'],
    queryFn: () => base44.entities.WorkRelease.list('-created_date', 5000),
    staleTime: 60 * 1000,
  });

  const { data: suggestions = [] } = useQuery({
    queryKey: ['admin-overview-suggestions'],
    queryFn: () => base44.entities.WorkSuggestion.list('-created_at', 200),
    staleTime: 30 * 1000,
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['admin-overview-reports'],
    queryFn: () => base44.entities.ContentReport.list('-created_at', 200),
    staleTime: 30 * 1000,
  });

  // Persisted sync data (NOT localStorage)
  const { data: syncRuns = [] } = useQuery({
    queryKey: ['admin-overview-sync-runs'],
    queryFn: () => base44.entities.SyncRun.list('-started_at', 1),
    staleTime: 30 * 1000,
  });

  const { data: pendingConflicts = [] } = useQuery({
    queryKey: ['admin-overview-pending-conflicts'],
    queryFn: () => base44.entities.SyncConflict.filter({ status: 'pending' }, '-created_date', 100),
    staleTime: 30 * 1000,
  });

  const activeWorks = dynamicWorks.filter(w => hasActiveCategory(parseCategories(w))).length;
  const activeReleases = releases.filter(r => isCategoryActive(r.category)).length;
  const pendingSuggestions = suggestions.filter(s => s.suggestion_status === 'pending').length;
  const pendingReports = reports.filter(r => r.report_status === 'pending').length;

  const lastRun = syncRuns[0];
  const lastRunSummary = parseSummary(lastRun?.summary);
  const lastRunErrors = lastRunSummary.errors || 0;
  const lastRunDate = lastRun?.started_at
    ? new Date(lastRun.started_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null;
  const lastRunStatus = lastRun?.status || null;
  const statusColor = lastRunStatus === 'completed' ? 'text-primary' : lastRunStatus === 'failed' ? 'text-destructive' : lastRunStatus === 'running' ? 'text-chart-4' : 'text-muted-foreground';

  return (
    <div className="space-y-6">
      {/* Section title */}
      <div>
        <h2 className="font-space font-bold text-xl text-foreground">Visão Geral</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Resumo do estado da plataforma</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Library} value={activeWorks} label="Animes ativos" color="bg-primary/15 text-primary" />
        <StatCard icon={GitBranch} value={activeReleases} label="Releases estruturadas" color="bg-chart-2/15 text-chart-2" />
        <StatCard icon={MessageSquare} value={pendingSuggestions} label="Sugestões pendentes" color="bg-chart-4/15 text-chart-4" />
        <StatCard icon={Flag} value={pendingReports} label="Denúncias pendentes" color="bg-destructive/15 text-destructive" />
      </div>

      {/* Catalog health */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-space font-bold text-sm text-foreground mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Saúde do catálogo
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Última execução</span>
            <span className="text-foreground font-medium">
              {lastRunDate || 'Nunca'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <span className={`font-medium ${statusColor}`}>
              {lastRunStatus ? (lastRun.dry_run ? `Simulação · ${lastRunStatus}` : lastRunStatus) : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" /> Erros
            </span>
            <span className={`font-medium ${lastRunErrors > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {lastRunErrors}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <FileSearch className="w-3 h-3" /> Reviews pendentes
            </span>
            <span className={`font-medium ${pendingConflicts.length > 0 ? 'text-chart-4' : 'text-muted-foreground'}`}>
              {pendingConflicts.length}
            </span>
          </div>
        </div>
      </div>

      {/* Catalog status */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-space font-bold text-sm text-foreground mb-4">Status do catálogo</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Modo</span>
            <span className="text-primary font-medium">{ANIME_ONLY_MODE ? 'Anime Only' : 'Multi-categoria'}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Categorias ativas</span>
            <span className="text-foreground font-medium">Anime</span>
          </div>
          {FROZEN_CATEGORIES.length > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Congeladas</span>
              <span className="text-destructive/80 font-medium text-right">
                {FROZEN_CATEGORIES.map(c => CATEGORY_DEFINITIONS[c]).join(' · ')}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Última atualização
            </span>
            <span className="text-foreground font-medium">
              {lastRunDate || 'Nunca'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-space font-bold text-sm text-foreground mb-4">Ações rápidas</h3>
        <div className="space-y-2">
          <QuickAction
            icon={RefreshCw}
            iconColor="text-primary"
            title="Atualizar catálogo"
            description="Verifica status, episódios e novas temporadas"
            onClick={() => onNavigate('catalog')}
          />
          <QuickAction
            icon={MessageSquare}
            iconColor="text-chart-4"
            title="Revisar sugestões"
            description={`${pendingSuggestions} sugestão(ões) aguardando aprovação`}
            onClick={() => onNavigate('community')}
          />
          <QuickAction
            icon={Flag}
            iconColor="text-destructive"
            title="Ver moderação"
            description={`${pendingReports} denúncia(s) para revisão`}
            onClick={() => onNavigate('community')}
          />
        </div>
      </div>
    </div>
  );
}