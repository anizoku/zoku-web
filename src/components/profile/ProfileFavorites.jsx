import { Tv, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ProfileFavorites({ profile }) {
  if (!profile?.favorite_animes?.length && !profile?.favorite_mangas?.length) return null;
  return (
    <div className="mt-4 pt-4 border-t border-border space-y-2">
      {profile.favorite_animes?.length > 0 && (
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
            <Tv className="w-3 h-3" /> Animes fav.:
          </span>
          {profile.favorite_animes.map(a => (
            <Badge key={a} variant="outline" className="text-[10px] border-chart-2/20 text-chart-2 px-1.5 py-0">{a}</Badge>
          ))}
        </div>
      )}
      {profile.favorite_mangas?.length > 0 && (
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
            <BookOpen className="w-3 h-3" /> Mangás fav.:
          </span>
          {profile.favorite_mangas.map(m => (
            <Badge key={m} variant="outline" className="text-[10px] border-chart-3/20 text-chart-3 px-1.5 py-0">{m}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}