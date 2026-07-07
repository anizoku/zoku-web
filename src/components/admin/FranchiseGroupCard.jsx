import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Check, X, Crown, Trash2, Network, AlertTriangle, Download } from "lucide-react";

/**
 * FranchiseGroupCard — displays a single franchise group for admin review.
 * Shows the detected root (highlighted, editable) and absorbed seasons.
 * Allows: confirm, correct root, remove a season from group, skip.
 */
export default function FranchiseGroupCard({ group, index, onAction, verifying }) {
  const [rootInput, setRootInput] = useState("");
  const [showRootInput, setShowRootInput] = useState(false);

  const root = group.rootOverride || group.root;
  const activeAbsorbed = group.absorbed.filter(
    (a) => !group.removedSeasons?.includes(a.id)
  );
  const isPending = group.status === "pending";
  const isMerged = group.status === "merged";
  const isSkipped = group.status === "skipped";

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        isMerged
          ? "border-primary/30 bg-primary/5"
          : isSkipped
          ? "border-muted bg-muted/10 opacity-60"
          : "border-border bg-card"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold text-foreground text-sm capitalize">
            {group.franchiseKey}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {group.allItems.length} obras detectadas · {activeAbsorbed.length} serão absorvidas
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {isMerged && (
            <Badge className="bg-primary/15 text-primary border-none">
              <Check className="w-3 h-3 mr-1" /> Fundido
            </Badge>
          )}
          {isSkipped && <Badge variant="secondary">Pulado</Badge>}
        </div>
      </div>

      {/* Root work */}
      <div className="mb-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <Crown className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-primary">RAIZ DETECTADA</span>
          {group.rootOverride && (
            <Badge className="text-[10px] bg-chart-4/15 text-chart-4 border-none">Corrigida</Badge>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{root.title}</p>
            <p className="text-xs text-muted-foreground">
              mal_id: {root.mal_id} · {root.year || "?"} · {root.episodes || "?"} eps
            </p>
          </div>
          {isPending && (
            <div className="flex gap-1 shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setShowRootInput(!showRootInput)}
                title="Corrigir raiz"
              >
                <Network className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* CORREÇÃO 2: Heurística — raiz provavelmente faltante (baseada em título) */}
        {group.rootLikelyMissing && !group.rootMissing && isPending && (
          <div className="mt-2 rounded-md border border-chart-4/30 bg-chart-4/10 p-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-chart-4 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-chart-4">
                  Raiz real pode não estar no catálogo
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Título sugere temporada posterior. Clique "Verificar Jikan" para confirmar.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CORREÇÃO 2: Aviso de raiz real não importada (confirmada via Jikan) */}
        {group.rootMissing && isPending && (
          <div className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 p-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-destructive">
                  Raiz real (mal_id {group.rootMissingMalId}) não está no catálogo
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {group.rootMissingTitle || "Título desconhecido"}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 mt-1.5 gap-1 text-xs"
                  disabled={verifying}
                  onClick={() => onAction(index, "importRoot")}
                >
                  {verifying ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Download className="w-3 h-3" />
                  )}
                  Importar raiz
                </Button>
              </div>
            </div>
          </div>
        )}

        {showRootInput && isPending && (
          <div className="mt-2 flex gap-2">
            <Input
              placeholder="mal_id da raiz correta"
              value={rootInput}
              onChange={(e) => setRootInput(e.target.value)}
              className="h-7 text-xs"
            />
            <Button
              size="sm"
              variant="secondary"
              className="h-7"
              disabled={!rootInput}
              onClick={() => {
                const malId = parseInt(rootInput);
                const newRoot = group.allItems.find((w) => w.mal_id === malId);
                if (newRoot) {
                  onAction(index, "setRoot", malId);
                  setShowRootInput(false);
                  setRootInput("");
                }
              }}
            >
              Confirmar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7"
              disabled={verifying}
              onClick={() => onAction(index, "verifyJikan")}
            >
              {verifying ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                "Verificar Jikan"
              )}
            </Button>
          </div>
        )}

        {group.verificationResult && (
          <p className="text-xs text-muted-foreground mt-2">
            <Network className="w-3 h-3 inline mr-1" />
            Jikan: raiz = {group.verificationResult.franchise_id} (
            {group.verificationResult.chain?.length || 0} na cadeia)
          </p>
        )}
      </div>

      {/* Absorbed seasons */}
      <div className="space-y-1.5 mb-3">
        {activeAbsorbed.map((w) => (
          <div
            key={w.id}
            className="flex items-center justify-between gap-2 rounded-md bg-secondary/40 px-3 py-1.5"
          >
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{w.title}</p>
              <p className="text-[10px] text-muted-foreground">
                mal_id: {w.mal_id} · {w.year || "?"} · {w.episodes || "?"} eps
              </p>
            </div>
            {isPending && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => onAction(index, "removeSeason", w.id)}
                title="Remover do grupo (manter como obra separada)"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Removed seasons note */}
      {group.removedSeasons?.length > 0 && (
        <p className="text-[10px] text-chart-4 mb-2">
          <AlertTriangle className="w-3 h-3 inline mr-1" />
          {group.removedSeasons.length} temporada(s) removida(s) do grupo
        </p>
      )}

      {/* Actions */}
      {isPending && (
        <div className="flex gap-2">
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => onAction(index, "merge")}
          >
            <Check className="w-3.5 h-3.5" /> Confirmar Merge
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => onAction(index, "skip")}
          >
            <X className="w-3.5 h-3.5" /> Pular
          </Button>
        </div>
      )}
    </div>
  );
}