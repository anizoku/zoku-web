import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Flag } from "lucide-react";

const REASONS = [
  { value: "spam", label: "Spam" },
  { value: "hate_speech", label: "Discurso de ódio" },
  { value: "nsfw", label: "Conteúdo adulto" },
  { value: "harassment", label: "Assédio" },
  { value: "spoiler", label: "Spoiler sem aviso" },
  { value: "misinformation", label: "Desinformação" },
  { value: "other", label: "Outro" },
];

export default function ReportModal({ open, onClose, contentType, contentId, contentPreview, authorEmail, userEmail }) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    try {
      // Check for duplicate
      const existing = await base44.entities.ContentReport.filter({
        reported_by_email: userEmail,
        content_id: contentId,
      });
      if (existing.length > 0) {
        toast.info("Você já reportou este conteúdo.");
        onClose();
        return;
      }

      await base44.entities.ContentReport.create({
        reported_by_email: userEmail,
        content_type: contentType,
        content_id: contentId,
        content_preview: contentPreview?.slice(0, 200) || "",
        author_email: authorEmail,
        reason,
        description: description.slice(0, 300) || undefined,
        report_status: "pending",
        created_at: new Date().toISOString(),
      });
      toast.success("Report enviado. Obrigado por ajudar a manter a comunidade saudável.");
      onClose();
      setReason("");
      setDescription("");
    } catch {
      toast.error("Erro ao enviar report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Flag className="w-4 h-4 text-destructive" /> Reportar conteúdo
          </DialogTitle>
        </DialogHeader>

        {contentPreview && (
          <div className="bg-secondary rounded-lg p-3 text-sm text-muted-foreground italic line-clamp-3">
            "{contentPreview.slice(0, 150)}{contentPreview.length > 150 ? "..." : ""}"
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Motivo</p>
          {REASONS.map((r) => (
            <label key={r.value} className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="radio"
                name="reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
                className="accent-primary"
              />
              <span className="text-sm text-foreground">{r.label}</span>
            </label>
          ))}
        </div>

        <div>
          <Textarea
            placeholder="Descreva o problema (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 300))}
            className="bg-secondary border-none resize-none h-20 text-sm"
          />
          <p className="text-[10px] text-muted-foreground text-right mt-1">{description.length}/300</p>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSubmit} disabled={!reason || submitting} className="flex-1">
            {submitting ? "Enviando..." : "Enviar report"}
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}