import { useState } from "react";
import { BookOpen, Tv, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import WatchTogetherButton from "@/components/social/WatchTogetherButton";

export default function CommonWorksSection({ myEntries, theirEntries, targetUser, currentUser }) {
  const [expanded, setExpanded] = useState(false);

  const myTitles = new Set(myEntries.map(e => e.title?.toLowerCase().trim()).filter(Boolean));
  const commonWorks = theirEntries.filter(e => e.title && myTitles.has(e.title.toLowerCase().trim()));

  if (commonWorks.length === 0) return null;

  const shown = expanded ? commonWorks : commonWorks.slice(0, 4);

  return (
    <div className="bg-card border border-primary/20 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Vocês têm <span className="text-primary font-bold">{commonWorks.length}</span> obra{commonWorks.length !== 1 ? "s" : ""} em comum
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {shown.map(entry => {
          const isAnime = entry.type === "anime";
          return (
            <div key={entry.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
              <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${isAnime ? "bg-chart-2/10" : "bg-chart-3/10"}`}>
                {isAnime ? <Tv className="w-3.5 h-3.5 text-chart-2" /> : <BookOpen className="w-3.5 h-3.5 text-chart-3" />}
              </div>
              <span className="text-xs text-foreground font-medium truncate">{entry.title}</span>
            </div>
          );
        })}
      </div>

      {commonWorks.length > 4 && (
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-primary hover:underline">
          {expanded ? "Ver menos" : `Ver todas (${commonWorks.length})`}
        </button>
      )}

      {targetUser && currentUser && (
        <WatchTogetherButton
          currentUser={currentUser}
          friendEmail={targetUser.email}
          friendName={targetUser.full_name}
          suggestedTitle={commonWorks[0]?.title}
          variant="outline"
          className="w-full h-8 text-xs gap-1.5"
        />
      )}
    </div>
  );
}