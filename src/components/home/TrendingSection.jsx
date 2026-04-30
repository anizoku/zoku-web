import { TrendingUp, Star } from "lucide-react";

const trendingAnimes = [
  { rank: 1, title: "Solo Leveling", genre: "Ação", rating: 9.2, cover: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=100&h=140&fit=crop" },
  { rank: 2, title: "Jujutsu Kaisen", genre: "Sobrenatural", rating: 9.0, cover: "https://images.unsplash.com/photo-1613376023733-0a73315d9b06?w=100&h=140&fit=crop" },
  { rank: 3, title: "One Piece", genre: "Aventura", rating: 9.5, cover: "https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=100&h=140&fit=crop" },
  { rank: 4, title: "Attack on Titan", genre: "Drama", rating: 9.3, cover: "https://images.unsplash.com/photo-1541562232579-512a21360020?w=100&h=140&fit=crop" },
  { rank: 5, title: "Demon Slayer", genre: "Ação", rating: 8.9, cover: "https://images.unsplash.com/photo-1607604276583-c1a320c02fc9?w=100&h=140&fit=crop" },
];

export default function TrendingSection() {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h3 className="font-space font-semibold text-sm">Trending Agora</h3>
      </div>
      <div className="space-y-3">
        {trendingAnimes.map((anime) => (
          <div
            key={anime.rank}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer group"
          >
            <span className="text-lg font-bold text-muted-foreground/40 w-5 text-center font-space">
              {anime.rank}
            </span>
            <div className="w-10 h-14 rounded-md bg-secondary overflow-hidden shrink-0">
              <img src={anime.cover} alt={anime.title} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                {anime.title}
              </p>
              <p className="text-xs text-muted-foreground">{anime.genre}</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-chart-4">
              <Star className="w-3 h-3 fill-chart-4" />
              {anime.rating}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}