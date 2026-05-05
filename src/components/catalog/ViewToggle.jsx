import { LayoutGrid, List } from "lucide-react";

export default function ViewToggle({ view, onChange }) {
  return (
    <div className="flex items-center bg-secondary rounded-lg p-0.5 border border-border">
      <button
        onClick={() => onChange("grid")}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
          view === "grid"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Grid</span>
      </button>
      <button
        onClick={() => onChange("list")}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
          view === "list"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <List className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Lista</span>
      </button>
    </div>
  );
}