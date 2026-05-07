import { useState } from "react";
import { Pencil, Unlink } from "lucide-react";
import { useOverrideMap } from "@/context/CardOverridesContext";
import AdminEditCardModal from "./AdminEditCardModal";

const ALL_CATEGORIES = ["anime", "manga", "movie", "liveaction"];

/**
 * Wraps any catalog card with admin editing capability.
 * For non-admins: completely transparent.
 * For admins: pencil icon on hover + badge if any override exists.
 */
export default function AdminEditableCard({ item, isAdmin, category, children }) {
  const overrideMap = useOverrideMap();
  const [modalOpen, setModalOpen] = useState(false);

  if (!isAdmin) return children;

  // Build a map of all overrides for this item, keyed by category
  const allOverridesByCategory = {};
  for (const cat of ALL_CATEGORIES) {
    const record = overrideMap.get(`${item?.slug}:${cat}`) || null;
    if (record) allOverridesByCategory[cat] = record;
  }
  // Also check legacy (no category)
  const legacyOverride = overrideMap.get(item?.slug) || null;

  const hasAnyOverride = Object.keys(allOverridesByCategory).length > 0 || legacyOverride;
  // Check if current category has a manual image override
  const currentCatOverride = (category && overrideMap.get(`${item?.slug}:${category}`)) || legacyOverride;
  const isManualOverride = currentCatOverride?.is_manual_override === true;

  return (
    <div className="relative group/admincard">
      {children}

      <button
        title="Editar card"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setModalOpen(true); }}
        className="absolute top-2 left-2 z-20 w-7 h-7 rounded-full bg-background/90 border border-border flex items-center justify-center opacity-0 group-hover/admincard:opacity-100 transition-opacity hover:bg-primary hover:text-primary-foreground hover:border-primary"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>

      {isManualOverride && (
        <div
          title="Este card foi editado manualmente."
          className="absolute top-2 right-2 z-20 flex items-center gap-1 px-1.5 py-0.5 rounded bg-chart-4/90 text-[9px] font-semibold text-background pointer-events-none"
        >
          <Unlink className="w-2.5 h-2.5" />
          Manual
        </div>
      )}

      <AdminEditCardModal
        item={item}
        allOverridesByCategory={allOverridesByCategory}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}