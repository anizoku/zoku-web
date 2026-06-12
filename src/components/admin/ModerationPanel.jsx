import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Flag, Trash2, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const REASON_LABELS = {
  spam: "Spam", hate_speech: "Discurso de ódio", nsfw: "Conteúdo adulto",
  harassment: "Assédio", spoiler: "Spoiler", misinformation: "Desinformação", other: "Outro"
};

const CONTENT_TYPE_LABELS = { post: "Post", comment: "Comentário", reply: "Resposta", profile: "Perfil" };

function ReportCard({ report, onAction }) {
  const [acting, setActing] = useState(false);

  const act = async (action, status) => {
    setActing(true);
    try {
      await base44.entities.ContentReport.update(report.id, {
        report_status: status,
        admin_action: action || undefined,
        reviewed_at: new Date().toISOString(),
      });

      if (action === "content_removed" && report.content_type === "post") {
        try { await base44.entities.Post.delete(report.content_id); } catch {}
      }
      if (action === "content_removed" && report.content_type === "comment") {
        try { await base44.entities.Comment.delete(report.content_id); } catch {}
      }

      // Notify author if actioned
      if (action && report.author_email) {
        const msg = action === "content_removed"
          ? "Seu conteúdo foi removido por violar as regras da comunidade."
          : "Você recebeu um aviso dos moderadores do ZOKU.";
        await base44.entities.Notification.create({
          recipient_email: report.author_email,
          type: "list_update",
          message: msg,
          from_name: "ZOKU Moderação",
        }).catch(() => {});
      }

      toast.success("Ação aplicada.");
      onAction();
    } catch {
      toast.error("Erro ao aplicar ação.");
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-destructive/10 text-destructive border-none text-xs">
            {CONTENT_TYPE_LABELS[report.content_type] || report.content_type}
          </Badge>
          <Badge className="bg-secondary text-muted-foreground border-none text-xs">
            {REASON_LABELS[report.reason] || report.reason}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {report.created_at ? formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale: ptBR }) : ""}
        </span>
      </div>

      {report.content_preview && (
        <div className="bg-secondary rounded-lg p-3 text-xs text-muted-foreground italic line-clamp-2">
          "{report.content_preview}"
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Reporter: <span className="text-foreground">{report.reported_by_email}</span></span>
        <span>Autor: <span className="text-foreground">{report.author_email || "—"}</span></span>
        {report.description && (
          <span className="col-span-2">Detalhe: <span className="text-foreground">{report.description}</span></span>
        )}
      </div>

      {report.report_status === "pending" && (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" variant="destructive" disabled={acting} onClick={() => act("content_removed", "actioned")}
            className="h-7 text-xs gap-1">
            <Trash2 className="w-3 h-3" /> Remover conteúdo
          </Button>
          <Button size="sm" variant="outline" disabled={acting} onClick={() => act("user_warned", "actioned")}
            className="h-7 text-xs gap-1 border-chart-4/30 text-chart-4 hover:bg-chart-4/10">
            <AlertTriangle className="w-3 h-3" /> Avisar usuário
          </Button>
          <Button size="sm" variant="ghost" disabled={acting} onClick={() => act(null, "dismissed")}
            className="h-7 text-xs gap-1 text-muted-foreground">
            <CheckCircle2 className="w-3 h-3" /> Dispensar
          </Button>
        </div>
      )}

      {report.report_status !== "pending" && (
        <div className="text-xs text-muted-foreground">
          Status: <span className="font-medium text-foreground capitalize">{report.report_status}</span>
          {report.admin_action && <> · Ação: <span className="font-medium text-foreground">{report.admin_action}</span></>}
        </div>
      )}
    </div>
  );
}

export default function ModerationPanel() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("pending");

  const { data: reports = [] } = useQuery({
    queryKey: ["content-reports"],
    queryFn: () => base44.entities.ContentReport.list("-created_at", 200),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["content-reports"] });

  const pending = reports.filter(r => r.report_status === "pending");
  const reviewed = reports.filter(r => r.report_status === "actioned");
  const dismissed = reports.filter(r => r.report_status === "dismissed");

  const sections = { pending, reviewed, dismissed };
  const currentReports = sections[tab] || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: "pending", label: "Pendentes", count: pending.length, color: "text-destructive" },
          { key: "reviewed", label: "Revisados", count: reviewed.length, color: "text-chart-4" },
          { key: "dismissed", label: "Dispensados", count: dismissed.length, color: "text-muted-foreground" },
        ].map(s => (
          <button key={s.key} onClick={() => setTab(s.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === s.key ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}>
            {s.label}
            {s.count > 0 && <span className={`text-xs font-bold ${s.color}`}>{s.count}</span>}
          </button>
        ))}
      </div>

      {currentReports.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <Flag className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">Nenhum report {tab === "pending" ? "pendente" : tab === "reviewed" ? "revisado" : "dispensado"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentReports.map(r => <ReportCard key={r.id} report={r} onAction={refresh} />)}
        </div>
      )}
    </div>
  );
}