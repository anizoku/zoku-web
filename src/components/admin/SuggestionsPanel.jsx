import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCatalog } from "@/contexts/CatalogContext";
import { CATALOG } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, ExternalLink, ChevronDown, ChevronUp, Star, Loader2, Trophy, Snowflake } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { isCategoryActive } from "@/lib/scopeConfig";

function slugify(title) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function SuggestionCard({ suggestion, profiles, onApprove, onReject, approving, rejecting }) {
  const [showRejectNote, setShowRejectNote] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  const profile = profiles.find((p) => p.user_email === suggestion.suggested_by_email);
  const displayName = profile?.username
    ? `@${profile.username}`
    : suggestion.suggested_by_email;

  return (
    <div className="bg-secondary/30 rounded-xl border border-border p-4 space-y-3">
      <div className="flex gap-3">
        {suggestion.image_url && (
          <img
            src={suggestion.image_url}
            alt={suggestion.title}
            className="w-16 h-24 object-cover rounded-lg shrink-0 bg-secondary"
          />
        )}
        <div className="flex-1 min-w-0 space-y-1">
          <h4 className="font-space font-bold text-sm text-foreground leading-tight">{suggestion.title}</h4>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] border-border capitalize">{suggestion.type}</Badge>
            {suggestion.year && <span className="text-[10px] text-muted-foreground">{suggestion.year}</span>}
            {suggestion.score > 0 && (
              <span className="text-[10px] flex items-center gap-0.5 text-chart-4">
                <Star className="w-2.5 h-2.5 fill-chart-4" />{suggestion.score}
              </span>
            )}
            {suggestion.status && (
              <span className="text-[10px] text-muted-foreground">{suggestion.status}</span>
            )}
          </div>
          {suggestion.genres && (
            <p className="text-[10px] text-muted-foreground">{suggestion.genres}</p>
          )}
          {(suggestion.episodes || suggestion.chapters) && (
            <p className="text-[10px] text-muted-foreground">
              {suggestion.episodes ? `${suggestion.episodes} eps.` : `${suggestion.chapters} caps.`}
            </p>
          )}
          {suggestion.synopsis && (
            <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{suggestion.synopsis}</p>
          )}
          <div className="flex items-center gap-3 pt-1">
            <span className="text-[10px] text-muted-foreground">por {displayName}</span>
            {suggestion.created_at && (
              <span className="text-[10px] text-muted-foreground">
                {format(new Date(suggestion.created_at), "d 'de' MMM yyyy", { locale: ptBR })}
              </span>
            )}
            {suggestion.mal_url && (
              <a
                href={suggestion.mal_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-primary/70 hover:text-primary flex items-center gap-0.5"
              >
                <ExternalLink className="w-3 h-3" /> MAL
              </a>
            )}
          </div>
        </div>
      </div>

      {suggestion.suggestion_status === "pending" && (
        <div className="space-y-2">
          {showRejectNote && (
            <Textarea
              placeholder="Motivo da rejeição (opcional)..."
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              className="text-xs bg-secondary border-none h-16 resize-none"
            />
          )}
          <div className="flex gap-2">
            {isCategoryActive(suggestion.type) ? (
              <Button
                size="sm"
                className="text-xs bg-primary/15 text-primary hover:bg-primary/25 border-none flex-1"
                onClick={() => onApprove(suggestion)}
                disabled={approving || rejecting}
              >
                {approving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                Aprovar
              </Button>
            ) : (
              <div className="flex-1 flex items-center justify-center gap-1 text-xs text-destructive/80 bg-destructive/5 rounded-md px-2 py-1.5 border border-destructive/20">
                <Snowflake className="w-3 h-3" />
                <span className="font-medium">Categoria congelada — aprovação indisponível</span>
              </div>
            )}
            {!showRejectNote ? (
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-destructive/30 text-destructive hover:bg-destructive/10 flex-1"
                onClick={() => setShowRejectNote(true)}
                disabled={approving || rejecting}
              >
                <XCircle className="w-3 h-3 mr-1" /> Rejeitar
              </Button>
            ) : (
              <Button
                size="sm"
                variant="destructive"
                className="text-xs flex-1"
                onClick={() => onReject(suggestion, rejectNote)}
                disabled={approving || rejecting}
              >
                {rejecting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                Confirmar rejeição
              </Button>
            )}
          </div>
        </div>
      )}

      {suggestion.suggestion_status !== "pending" && suggestion.admin_note && (
        <p className="text-[10px] text-muted-foreground bg-secondary rounded-lg px-2.5 py-1.5 border border-border">
          Nota: {suggestion.admin_note}
        </p>
      )}
    </div>
  );
}

function CollapsibleSection({ title, count, color, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-secondary/30 hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-foreground">{title}</span>
          {count > 0 && (
            <Badge className={`text-[10px] border-none ${color}`}>{count}</Badge>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
}

export default function SuggestionsPanel() {
  const queryClient = useQueryClient();
  const { catalog, refreshCatalog } = useCatalog();
  const [actionId, setActionId] = useState(null);

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ["all-suggestions"],
    queryFn: () => base44.entities.WorkSuggestion.list("-created_at", 200),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["user-profiles"],
    queryFn: () => base44.entities.UserProfile.list("-created_date", 200),
    initialData: [],
  });

  const pending = suggestions.filter((s) => s.suggestion_status === "pending");
  const approved = suggestions.filter((s) => s.suggestion_status === "approved");
  const rejected = suggestions.filter((s) => s.suggestion_status === "rejected");

  async function sendNotification(suggestion, isApproved, adminNote, slug) {
    const message = isApproved
      ? `Sua sugestão de "${suggestion.title}" foi aprovada! A obra já está no catálogo.`
      : `Sua sugestão de "${suggestion.title}" foi rejeitada.${adminNote ? ` Motivo: ${adminNote}` : ""}`;

    await base44.entities.Notification.create({
      recipient_email: suggestion.suggested_by_email,
      type: isApproved ? "list_update" : "post_liked",
      message,
      from_name: "ZOKU Admin",
      from_email: "admin",
      reference_id: isApproved && slug ? slug : null,
      is_read: false,
    });
  }

  const approveMutation = useMutation({
    mutationFn: async (suggestion) => {
      // ── FREEZE GUARD (mutation-level) ──────────────────────────────
      // Blocks approval for frozen categories even if UI is bypassed.
      if (!isCategoryActive(suggestion.type)) {
        throw new Error(`CATEGORY_FROZEN: ${suggestion.type} is not active — approval blocked (0 CatalogSync writes).`);
      }

      // Check if already in catalog
      const alreadyInCatalog = catalog.some(
        (w) => w.mal_id === suggestion.mal_id || w.manga_mal_id === suggestion.mal_id
      );

      let slug = null;
      let adminNote = null;

      if (alreadyInCatalog) {
        adminNote = "Obra já estava no catálogo";
        slug = catalog.find(
          (w) => w.mal_id === suggestion.mal_id || w.manga_mal_id === suggestion.mal_id
        )?.slug;
      } else {
        // Create CatalogSync entry
        slug = slugify(suggestion.title);
        const syncData = {
          slug,
          total_episodes: suggestion.episodes || null,
          total_chapters: suggestion.chapters || null,
          anime_status: suggestion.type === "anime" ? suggestion.status : null,
          manga_status: suggestion.type === "manga" ? suggestion.status : null,
          mal_id: suggestion.type === "anime" ? suggestion.mal_id : null,
          manga_mal_id: suggestion.type === "manga" ? suggestion.mal_id : null,
          score: suggestion.score || null,
          synced_at: new Date().toISOString(),
          sync_status: "synced",
        };

        // Check if CatalogSync record exists
        const existing = await base44.entities.CatalogSync.filter({ slug });
        if (existing && existing.length > 0) {
          await base44.entities.CatalogSync.update(existing[0].id, syncData);
        } else {
          await base44.entities.CatalogSync.create(syncData);
        }
      }

      // Update suggestion status
      await base44.entities.WorkSuggestion.update(suggestion.id, {
        suggestion_status: "approved",
        admin_note: adminNote,
        reviewed_at: new Date().toISOString(),
      });

      // Send notification
      await sendNotification(suggestion, true, null, slug);

      return { slug, alreadyInCatalog };
    },
    onSuccess: ({ alreadyInCatalog }) => {
      queryClient.invalidateQueries({ queryKey: ["all-suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["my-suggestions"] });
      refreshCatalog();
      setActionId(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ suggestion, note }) => {
      await base44.entities.WorkSuggestion.update(suggestion.id, {
        suggestion_status: "rejected",
        admin_note: note || null,
        reviewed_at: new Date().toISOString(),
      });
      await sendNotification(suggestion, false, note, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["my-suggestions"] });
      setActionId(null);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Trophy className="w-4 h-4 text-chart-4" />
        <h2 className="font-space font-semibold text-base text-foreground">Sugestões de obras</h2>
        {pending.length > 0 && (
          <Badge className="text-[10px] bg-chart-4/15 text-chart-4 border-none">{pending.length} pendente{pending.length !== 1 ? "s" : ""}</Badge>
        )}
      </div>

      {suggestions.length === 0 && (
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma sugestão recebida ainda.</p>
        </div>
      )}

      <CollapsibleSection
        title="Pendentes"
        count={pending.length}
        color="bg-chart-4/15 text-chart-4"
        defaultOpen={true}
      >
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">Nenhuma sugestão pendente.</p>
        ) : (
          pending.map((s) => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              profiles={profiles}
              approving={approveMutation.isPending && actionId === s.id}
              rejecting={rejectMutation.isPending && actionId === s.id}
              onApprove={(sugg) => { setActionId(sugg.id); approveMutation.mutate(sugg); }}
              onReject={(sugg, note) => { setActionId(sugg.id); rejectMutation.mutate({ suggestion: sugg, note }); }}
            />
          ))
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Aprovadas"
        count={approved.length}
        color="bg-primary/15 text-primary"
        defaultOpen={false}
      >
        {approved.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">Nenhuma aprovada ainda.</p>
        ) : (
          approved.map((s) => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              profiles={profiles}
              onApprove={() => {}}
              onReject={() => {}}
            />
          ))
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Rejeitadas"
        count={rejected.length}
        color="bg-destructive/15 text-destructive"
        defaultOpen={false}
      >
        {rejected.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">Nenhuma rejeitada ainda.</p>
        ) : (
          rejected.map((s) => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              profiles={profiles}
              onApprove={() => {}}
              onReject={() => {}}
            />
          ))
        )}
      </CollapsibleSection>
    </div>
  );
}