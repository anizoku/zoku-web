import { useState } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GenreFilter({ allGenres, selectedGenres, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const visibleGenres = expanded ? allGenres : allGenres.slice(0, 12);

  function toggle(genre) {
    if (selectedGenres.includes(genre)) {
      onChange(selectedGenres.filter((g) => g !== genre));
    } else {
      onChange([...selectedGenres, genre]);
    }
  }

  if (allGenres.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Filtrar por gênero</p>
        {selectedGenres.length > 0 && (
          <button
            onClick={() => onChange([])}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="w-3 h-3" /> Limpar
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {visibleGenres.map((genre) => (
          <button
            key={genre}
            onClick={() => toggle(genre)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
              selectedGenres.includes(genre)
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {genre}
          </button>
        ))}
      </div>
      {allGenres.length > 12 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <><ChevronUp className="w-3 h-3" /> Menos</> : <><ChevronDown className="w-3 h-3" /> +{allGenres.length - 12} gêneros</>}
        </button>
      )}
    </div>
  );
}