import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Star, ExternalLink, Lightbulb } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig = {
  pending: { label: "Pendente", color: "bg-chart-4/15 text-chart-4" },
  approved: { label: "Aprovada", color: "bg-primary/15 text-primary" },
  rejected: { label: "Rejeitada", color: "bg-destructive/15 text-destructive" },
};

export default function MySuggestions({ userEmail }) {
  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ["my-suggestions", userEmail],
    queryFn: () => base44.entities.WorkSuggestion.list("-created_at", 100),
    enabled: !!userEmail,
  });

  const mySuggestions = suggestions.filter((s) => s.suggested_by_email === userEmail);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-card rounded-xl border border-border animate-pulse" />
        ))}
      </div>
    );
  }

  if (mySuggestions.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center space-y-3">
        <Lightbulb className="w-10 h-10 text-muted-foreground/20 mx-auto" />
        <p className="text-sm text-muted-foreground">
          Você ainda não sugeriu nenhuma obra.
        </p>
        <p className="text-xs text-muted-foreground">
          Explore o catálogo e sugira obras que estão faltando!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {mySuggestions.map((s) => {
        const cfg = statusConfig[s.suggestion_status] || statusConfig.pending;
        return (
          <div
            key={s.id}
            className="bg-card rounded-xl border border-border p-3 flex gap-3 items-start"
          >
            {s.image_url && (
              <img
                src={s.image_url}
                alt={s.title}
                className="w-12 h-16 object-cover rounded-lg shrink-0 bg-secondary"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-sm text-foreground leading-tight truncate">{s.title}</p>
                <Badge className={`text-[10px] border-none shrink-0 ${cfg.color}`}>{cfg.label}</Badge>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[10px] text-muted-foreground capitalize">{s.type}</span>
                {s.year && <span className="text-[10px] text-muted-foreground">{s.year}</span>}
                {s.score > 0 && (
                  <span className="text-[10px] flex items-center gap-0.5 text-chart-4">
                    <Star className="w-2.5 h-2.5 fill-chart-4" />{s.score}
                  </span>
                )}
              </div>
              {s.created_at && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Sugerida em {format(new Date(s.created_at), "d 'de' MMM yyyy", { locale: ptBR })}
                </p>
              )}
              {s.admin_note && (
                <p className="text-[10px] text-muted-foreground bg-secondary rounded px-2 py-1 mt-1.5 border border-border">
                  Nota do admin: {s.admin_note}
                </p>
              )}
              {s.mal_url && (
                <a
                  href={s.mal_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-primary/70 hover:text-primary flex items-center gap-0.5 mt-1"
                >
                  <ExternalLink className="w-3 h-3" /> Ver no MAL
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}