import { Tv } from 'lucide-react';
import { Badge } from '../../ui/badge';

export default function SupabaseProfileFavorites({ favorites }) {
  // Favorites remain anime titles, not catalog records or legacy manga fields.
  if (!favorites?.length) return null;
  return <section aria-label="Animes favoritos" className="mt-4 pt-4 border-t border-border">
    <div className="flex items-start gap-2 flex-wrap">
      <h2 className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
        <Tv className="w-3 h-3" /> Animes fav.:
      </h2>
      {favorites.map((title, index) => <Badge key={`${index}-${title}`} variant="outline"
        className="text-[10px] border-chart-2/20 text-chart-2 px-1.5 py-0 max-w-full break-words [overflow-wrap:anywhere]">
        {title}
      </Badge>)}
    </div>
  </section>;
}
