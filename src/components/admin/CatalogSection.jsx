import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import CatalogUpdatePanel from "./CatalogUpdatePanel";
import ReleaseSyncPanel from "./ReleaseSyncPanel";
import CategoryManager from "./CategoryManager";
import CatalogAdvancedPanel from "./CatalogAdvancedPanel";

const SUB_SECTIONS = [
  { key: 'update', label: 'Atualização' },
  { key: 'releases', label: 'Releases' },
  { key: 'visibility', label: 'Visibilidade' },
  { key: 'advanced', label: 'Avançado' },
];

/**
 * CatalogSection — Consolidates catalog management into sub-sections
 * with clean pill navigation (no nested tabs architecture).
 */
export default function CatalogSection() {
  const [sub, setSub] = useState('update');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-space font-bold text-xl text-foreground">Catálogo</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Atualização, visibilidade e ferramentas avançadas</p>
      </div>

      {/* Sub-navigation pills */}
      <div className="flex gap-2 flex-wrap">
        {SUB_SECTIONS.map(s => (
          <button
            key={s.key}
            onClick={() => setSub(s.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring
              ${sub === s.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {sub === 'update' && <CatalogUpdatePanel />}
      {sub === 'releases' && <ReleaseSyncPanel />}
      {sub === 'visibility' && <CategoryManager />}
      {sub === 'advanced' && (
        <div className="space-y-4">
          <div className="bg-chart-4/5 border border-chart-4/20 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-chart-4 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Ferramentas avançadas</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Estas ferramentas alteram a estrutura do catálogo. Use com cautela.
              </p>
            </div>
          </div>
          <CatalogAdvancedPanel />
        </div>
      )}
    </div>
  );
}