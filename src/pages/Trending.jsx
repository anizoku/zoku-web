import { TrendingUp, Star, Eye, BookOpen, Tv, Film } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState } from "react";
import { CATALOG } from "@/lib/catalog";
import MediaDrawer from "@/components/media/MediaDrawer";

// Top trending — sorted by rating, top 18
const trending = [...CATALOG].sort((a, b) => b.rating - a.rating).slice(0, 18).map((item, i) => ({
  ...item,
  rank: i + 1,
  viewers: `${(Math.random() * 3 + 0.5).toFixed(1)}M`,
}));

const typeIcon = { anime: <Tv className="w-3 h-3" />, manga: <BookOpen className="w-3 h-3" />, movie: <Film className="w-3 h-3" /> };
const typeLabel = { anime: "Anime", manga: "Mangá", movie: "Filme" };
const typeBg = { anime: "bg-chart-2/80", manga: "bg-chart-3/80", movie: "bg-chart-5/80" };

function TrendingCard({ item, onClick }) {
  const primaryCat = item.categories[0];
  return (
    <div
      onClick={() => onClick(item)}
      className="bg-card rounded-xl border border-border overflow-hidden hover:border-primary/30 transition-all group cursor-pointer"
    >
      <div className="relative h-48 overflow-hidden">
        <img src={item.cover} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
        <div className="absolute top-3 left-3">
          <span className="font-space font-bold text-2xl text-white/80 drop-shadow">#{item.rank}</span>
        </div>
        <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
          {item.categories.map(cat => (
            <Badge key={cat} className={`${typeBg[cat]} text-white border-none text-[9px] flex items-center gap-1`}>
              {typeIcon[cat]} {typeLabel[cat]}
            </Badge>
          ))}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm leading-tight">{item.title}</h3>
        <p className="text-xs text-muted-foreground mt-1">{item.genres.slice(0, 2).join(" / ")}</p>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1 text-xs text-chart-4">
            <Star className="w-3.5 h-3.5 fill-chart-4" /> {item.rating}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="w-3.5 h-3.5" /> {item.viewers}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Trending() {
  const [selected, setSelected] = useState(null);

  const animes = trending.filter(i => i.categories.includes("anime"));
  const mangas = trending.filter(i => i.categories.includes("manga"));
  const movies = trending.filter(i => i.categories.includes("movie"));

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-space font-bold text-2xl text-foreground">Trending</h1>
          <p className="text-sm text-muted-foreground">Os mais populares do catálogo</p>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="bg-secondary mb-6">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="anime">Animes</TabsTrigger>
          <TabsTrigger value="manga">Mangás</TabsTrigger>
          <TabsTrigger value="movie">Filmes</TabsTrigger>
        </TabsList>

        {[
          { key: "all", data: trending },
          { key: "anime", data: animes },
          { key: "manga", data: mangas },
          { key: "movie", data: movies },
        ].map(({ key, data }) => (
          <TabsContent key={key} value={key}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.map((item) => (
                <TrendingCard key={item.slug} item={item} onClick={setSelected} />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {selected && (
        <MediaDrawer
          media={selected}
          type={selected.categories.includes("anime") ? "anime" : selected.categories.includes("manga") ? "manga" : "movie"}
          open={!!selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}