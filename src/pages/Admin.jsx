import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import AdminShell from "@/components/admin/AdminShell";
import AdminOverview from "@/components/admin/AdminOverview";
import CatalogSection from "@/components/admin/CatalogSection";
import SuggestionsPanel from "@/components/admin/SuggestionsPanel";
import ModerationPanel from "@/components/admin/ModerationPanel";
import NewsManager from "@/components/news/NewsManager";
import BannersPanel from "@/components/admin/BannersPanel";
import FanArtPanel from "@/components/admin/fanart/FanArtPanel";
import AppearanceManager from "@/components/admin/AppearanceManager";
import MigrateEntriesPanel from "@/components/admin/MigrateEntriesPanel";

function SubSectionNav({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 p-1 bg-secondary/30 rounded-lg w-fit mb-6">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-4 py-1.5 text-sm rounded-md transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
            active === t.id
              ? "bg-primary text-primary-foreground font-medium"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Admin — Modern admin area with vertical menu shell.
 * Auth is handled by RequireAdmin route guard (defense-in-depth).
 * This component only renders for authenticated admins.
 */
export default function Admin() {
  const [section, setSection] = useState('overview');

  const { data: pendingSuggestions = [] } = useQuery({
    queryKey: ["pending-suggestions-count"],
    queryFn: () => base44.entities.WorkSuggestion.list("-created_at", 200),
    select: (data) => data.filter((s) => s.suggestion_status === "pending"),
  });

  const { data: pendingReports = [] } = useQuery({
    queryKey: ["pending-reports-count"],
    queryFn: () => base44.entities.ContentReport.list("-created_at", 200),
    select: (data) => data.filter((r) => r.report_status === "pending"),
  });

  const communityBadge = pendingSuggestions.length + pendingReports.length;

  return (
    <AdminShell activeSection={section} onSectionChange={setSection} communityBadge={communityBadge}>
      {section === 'overview' && <AdminOverview onNavigate={setSection} />}

      {section === 'catalog' && <CatalogSection />}

      {section === 'community' && (
        <div className="space-y-8">
          <div>
            <h2 className="font-space font-bold text-xl text-foreground mb-1">Sugestões</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {pendingSuggestions.length} sugestão(ões) pendente(s)
            </p>
            <SuggestionsPanel />
          </div>
          <div>
            <h2 className="font-space font-bold text-xl text-foreground mb-1">Moderação</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {pendingReports.length} denúncia(s) pendente(s)
            </p>
            <ModerationPanel />
          </div>
        </div>
      )}

      {section === 'content' && (
        <ContentSection />
      )}

      {section === 'settings' && (
        <SettingsSection />
      )}
    </AdminShell>
  );
}

const CONTENT_TABS = [
  { id: 'news', label: 'Notícias' },
  { id: 'banners', label: 'Banners' },
  { id: 'fanart', label: 'Arte de fãs' },
];

const SETTINGS_TABS = [
  { id: 'appearance', label: 'Aparência' },
  { id: 'advanced', label: 'Avançado' },
];

function ContentSection() {
  const [tab, setTab] = useState('news');
  return (
    <div>
      <h2 className="font-space font-bold text-xl text-foreground mb-1">Conteúdo</h2>
      <p className="text-sm text-muted-foreground mb-4">Notícias, banners e arte de fãs</p>
      <SubSectionNav tabs={CONTENT_TABS} active={tab} onChange={setTab} />
      {tab === 'news' && <NewsManager />}
      {tab === 'banners' && <BannersPanel />}
      {tab === 'fanart' && <FanArtPanel />}
    </div>
  );
}

function SettingsSection() {
  const [tab, setTab] = useState('appearance');
  return (
    <div>
      <h2 className="font-space font-bold text-xl text-foreground mb-1">Configurações</h2>
      <p className="text-sm text-muted-foreground mb-4">Aparência e ferramentas avançadas</p>
      <SubSectionNav tabs={SETTINGS_TABS} active={tab} onChange={setTab} />
      {tab === 'appearance' && <AppearanceManager />}
      {tab === 'advanced' && <MigrateEntriesPanel />}
    </div>
  );
}