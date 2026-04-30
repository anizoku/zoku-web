import { TrendingUp, Star, Eye, BookOpen, Tv } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const trendingData = [
  { rank: 1, title: "Solo Leveling Season 2", type: "anime", genre: "Ação / Fantasia", rating: 9.2, viewers: "2.4M", cover: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&h=420&fit=crop" },
  { rank: 2, title: "Jujutsu Kaisen", type: "anime", genre: "Sobrenatural", rating: 9.0, viewers: "1.8M", cover: "https://images.unsplash.com/photo-1613376023733-0a73315d9b06?w=300&h=420&fit=crop" },
  { rank: 3, title: "One Piece", type: "manga", genre: "Aventura / Ação", rating: 9.5, viewers: "3.1M", cover: "https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=300&h=420&fit=crop" },
  { rank: 4, title: "Chainsaw Man", type: "manga", genre: "Ação / Horror", rating: 8.8, viewers: "1.2M", cover: "https://images.unsplash.com/photo-1541562232579-512a21360020?w=300&h=420&fit=crop" },
  { rank: 5, title: "Attack on Titan", type: "anime", genre: "Drama / Ação", rating: 9.3, viewers: "2.9M", cover: "https://images.unsplash.com/photo-1607604276583-c1a320c02fc9?w=300&h=420&fit=crop" },
  { rank: 6, title: "Spy x Family", type: "anime", genre: "Comédia / Ação", rating: 8.7, viewers: "1.5M", cover: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&h=420&fit=crop" },
];

function TrendingCard({ item }) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden hover:border-primary/30 transition-all group cursor-pointer">
      <div className="relative h-48 overflow-hidden">
        <img src={item.cover} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
        <div className="absolute top-3 left-3">
          <span className="font-space font-bold text-2xl text-white/80">#{item.rank}</span>
        </div>
        <div className="absolute top-3 right-3">
          <Badge className={item.type === "anime" ? "bg-chart-2/90 text-white border-none" : "bg-chart-3/90 text-white border-none"}>
            {item.type === "anime" ? <Tv className="w-3 h-3 mr-1" /> : <BookOpen className="w-3 h-3 mr-1" />}
            {item.type === "anime" ? "Anime" : "Mangá"}
          </Badge>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{item.title}</h3>
        <p className="text-xs text-muted-foreground mt-1">{item.genre}</p>
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
  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-space font-bold text-2xl text-foreground">Trending</h1>
          <p className="text-sm text-muted-foreground">Os mais populares da semana</p>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="bg-secondary mb-6">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="anime">Animes</TabsTrigger>
          <TabsTrigger value="manga">Mangás</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trendingData.map((item) => <TrendingCard key={item.rank} item={item} />)}
          </div>
        </TabsContent>
        <TabsContent value="anime">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trendingData.filter(i => i.type === "anime").map((item) => <TrendingCard key={item.rank} item={item} />)}
          </div>
        </TabsContent>
        <TabsContent value="manga">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trendingData.filter(i => i.type === "manga").map((item) => <TrendingCard key={item.rank} item={item} />)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}