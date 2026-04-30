import { Tv, Star, Eye, Clock, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const animeList = [
  { title: "Solo Leveling Season 2", genre: "Ação / Fantasia", status: "Em exibição", rating: 9.2, episodes: "12 eps", cover: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&h=400&fit=crop" },
  { title: "Jujutsu Kaisen S2", genre: "Sobrenatural / Ação", status: "Em exibição", rating: 9.0, episodes: "23 eps", cover: "https://images.unsplash.com/photo-1613376023733-0a73315d9b06?w=300&h=400&fit=crop" },
  { title: "Attack on Titan Final", genre: "Drama / Ação", status: "Completo", rating: 9.3, episodes: "87 eps", cover: "https://images.unsplash.com/photo-1541562232579-512a21360020?w=300&h=400&fit=crop" },
  { title: "Demon Slayer S4", genre: "Ação / Sobrenatural", status: "Em exibição", rating: 8.9, episodes: "8 eps", cover: "https://images.unsplash.com/photo-1607604276583-c1a320c02fc9?w=300&h=400&fit=crop" },
  { title: "One Piece", genre: "Aventura / Ação", status: "Em exibição", rating: 9.5, episodes: "1100+ eps", cover: "https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=300&h=400&fit=crop" },
  { title: "Spy x Family S2", genre: "Comédia / Ação", status: "Completo", rating: 8.7, episodes: "25 eps", cover: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&h=400&fit=crop" },
  { title: "Vinland Saga S2", genre: "Drama / Aventura", status: "Completo", rating: 8.8, episodes: "48 eps", cover: "https://images.unsplash.com/photo-1613376023733-0a73315d9b06?w=300&h=400&fit=crop" },
  { title: "Blue Lock", genre: "Esportes", status: "Em exibição", rating: 8.5, episodes: "24 eps", cover: "https://images.unsplash.com/photo-1541562232579-512a21360020?w=300&h=400&fit=crop" },
];

export default function Animes() {
  const [search, setSearch] = useState("");
  const filtered = animeList.filter((a) => a.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-chart-2/10 flex items-center justify-center">
            <Tv className="w-5 h-5 text-chart-2" />
          </div>
          <div>
            <h1 className="font-space font-bold text-2xl text-foreground">Animes</h1>
            <p className="text-sm text-muted-foreground">Explore e descubra novos animes</p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Buscar animes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm bg-secondary border-none"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((anime, i) => (
          <div key={i} className="bg-card rounded-xl border border-border overflow-hidden hover:border-chart-2/30 transition-all group cursor-pointer">
            <div className="relative aspect-[3/4] overflow-hidden">
              <img src={anime.cover} alt={anime.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <Badge className={anime.status === "Em exibição" ? "bg-primary/90 text-primary-foreground border-none text-[10px]" : "bg-secondary/90 text-secondary-foreground border-none text-[10px]"}>
                  {anime.status}
                </Badge>
              </div>
            </div>
            <div className="p-3">
              <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-chart-2 transition-colors">{anime.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{anime.genre}</p>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1 text-xs text-chart-4">
                  <Star className="w-3 h-3 fill-chart-4" /> {anime.rating}
                </div>
                <span className="text-[10px] text-muted-foreground">{anime.episodes}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}