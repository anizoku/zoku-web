import { useNavigate } from "react-router-dom";
import { LayoutGrid, Library, Users, FileText, Settings, ArrowLeft } from "lucide-react";
import { ANIME_ONLY_MODE, FROZEN_CATEGORIES, CATEGORY_DEFINITIONS } from "@/lib/scopeConfig";

const SECTIONS = [
  { key: 'overview', label: 'Visão Geral', icon: LayoutGrid },
  { key: 'catalog', label: 'Catálogo', icon: Library },
  { key: 'community', label: 'Comunidade', icon: Users },
  { key: 'content', label: 'Conteúdo', icon: FileText },
  { key: 'settings', label: 'Configurações', icon: Settings },
];

/**
 * AdminShell — Modern admin layout with vertical menu (desktop) and
 * horizontal scrollable tabs (mobile). Part of the AniZoku design system.
 */
export default function AdminShell({ activeSection, onSectionChange, communityBadge = 0, children }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="font-space font-bold text-lg text-foreground shrink-0">Administração</h1>
            {ANIME_ONLY_MODE && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 shrink-0"
                title={FROZEN_CATEGORIES.length > 0 ? `${FROZEN_CATEGORIES.map(c => CATEGORY_DEFINITIONS[c]).join(' · ')} congelados` : undefined}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-medium text-primary">Anime Only</span>
                {FROZEN_CATEGORIES.length > 0 && (
                  <span className="text-[10px] text-muted-foreground hidden md:inline">
                    · {FROZEN_CATEGORIES.map(c => CATEGORY_DEFINITIONS[c]).join(' · ')}
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Voltar ao Zoku</span>
          </button>
        </div>
      </header>

      {/* Mobile horizontal tabs */}
      <div className="lg:hidden sticky top-14 z-20 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex overflow-x-auto px-2 gap-1 py-2 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
          {SECTIONS.map(section => {
            const Icon = section.icon;
            const isActive = activeSection === section.key;
            return (
              <button
                key={section.key}
                onClick={() => onSectionChange(section.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0
                  ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{section.label}</span>
                {section.key === 'community' && communityBadge > 0 && (
                  <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${isActive ? 'bg-primary-foreground/20' : 'bg-chart-4/15 text-chart-4'}`}>
                    {communityBadge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Body: sidebar + content */}
      <div className="max-w-7xl mx-auto flex">
        {/* Desktop vertical menu */}
        <aside className="hidden lg:block w-56 shrink-0 border-r border-border min-h-[calc(100vh-3.5rem)] p-4">
          <nav className="space-y-1">
            {SECTIONS.map(section => {
              const Icon = section.icon;
              const isActive = activeSection === section.key;
              return (
                <button
                  key={section.key}
                  onClick={() => onSectionChange(section.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left
                    ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{section.label}</span>
                  {section.key === 'community' && communityBadge > 0 && (
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isActive ? 'bg-primary-foreground/20' : 'bg-chart-4/15 text-chart-4'}`}>
                      {communityBadge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 p-4 lg:p-6">
          {children || null}
        </main>
      </div>
    </div>
  );
}