import { useState } from "react";
import { Pencil, Unlink } from "lucide-react";
import { useOverrideMap } from "@/context/CardOverridesContext";
import { useCardDisplayData } from "@/hooks/useCardOverrides";
import AdminEditCardModal from "./AdminEditCardModal";

/**
 * Wraps any catalog card with admin editing capability.
 * For non-admins: completely transparent, no overhead.
 * For admins: pencil icon on hover + "Edição manual" badge.
 */
export default function AdminEditableCard({ item, isAdmin, children }) {
  const overrideMap = useOverrideMap();
  const { isManualOverride, overrideRecord } = useCardDisplayData(item, overrideMap);
  const [modalOpen, setModalOpen] = useState(false);

  if (!isAdmin) return children;

  return (
    <div className="relative group/admincard">
      {children}

      {/* Pencil button — visible on hover for admins */}
      <button
        title="Editar card"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setModalOpen(true); }}
        className="absolute top-2 left-2 z-20 w-7 h-7 rounded-full bg-background/90 border border-border flex items-center justify-center opacity-0 group-hover/admincard:opacity-100 transition-opacity hover:bg-primary hover:text-primary-foreground hover:border-primary"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>

      {/* Manual override badge — admin only */}
      {isManualOverride && (
        <div
          title="Este card foi editado manualmente e não sincroniza mais com os dados originais."
          className="absolute top-2 right-2 z-20 flex items-center gap-1 px-1.5 py-0.5 rounded bg-chart-4/90 text-[9px] font-semibold text-background pointer-events-none"
        >
          <Unlink className="w-2.5 h-2.5" />
          Manual
        </div>
      )}

      <AdminEditCardModal
        item={item}
        overrideRecord={overrideRecord}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}