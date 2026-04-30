import { BookOpen, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import MediaDrawer from "@/components/media/MediaDrawer";

const mangaList = [
  { title: "One Piece", genre: "Aventura / Ação", status: "Em publicação", rating: 9.5, totalChapters: 1122, chaptersLabel: "1100+ caps", cover: "https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=300&h=400&fit=crop" },
  { title: "Chainsaw Man Pt. 2", genre: "Ação / Horror", status: "Em publicação", rating: 8.8, totalChapters: 175, chaptersLabel: "170+ caps", cover: "https://images.unsplash.com/photo-1541562232579-512a21360020?w=300&h=400&fit=crop" },
  { title: "Jujutsu Kaisen", genre: "Sobrenatural", status: "Completo", rating: 9.0, totalChapters: 271, chaptersLabel: "271 caps", cover: "https://images.unsplash.com/photo-1613376023733-0a73315d9b06?w=300&h=400&fit=crop" },
  { title: "Berserk", genre: "Dark Fantasy", status: "Em publicação", rating: 9.7, totalChapters: 374, chaptersLabel: "370+ caps", cover: "https://images.unsplash.com/photo-1607604276583-c1a320c02fc9?w=300&h=400&fit=crop" },
  { title: "Vagabond", genre: "Drama / Samurai", status: "Hiato", rating: 9.6, totalChapters: 327, chaptersLabel: "327 caps", cover: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&h=400&fit=crop" },
  { title: "Blue Lock", genre: "Esportes", status: "Em publicação", rating: 8.5, totalChapters: 255, chaptersLabel: "250+ caps", cover: "https://images.unsplash.com/photo-1541562232579-512a21360020?w=300&h=400&fit=crop" },
  { title: "Dandadan", genre: "Ação / Comédia", status: "Em publicação", rating: 8.9, totalChapters: 145, chaptersLabel: "140+ caps", cover: "https://images.unsplash.com/photo-1613376023733-0a73315d9b06?w=300&h=400&fit=crop" },
  { title: "Spy x Family", genre: "Comédia / Ação", status: "Em publicação", rating: 8.7, totalChapters: 100, chaptersLabel: "95+ caps", cover: "https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=300&h=400&fit=crop" },
];

export default function Mangas() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const filtered = mangaList.filter((m) => m.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-chart-3/10 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-chart-3" />
          </div>
          <div>
            <h1 className="font-space font-bold text-2xl text-foreground">Mangás</h1>
            <p className="text-sm text-muted-foreground">Explore e descubra novos mangás</p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Buscar mangás..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm bg-secondary border-none"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((manga, i) => (
          <div
            key={i}
            onClick={() => setSelected(manga)}
            className="bg-card rounded-xl border border-border overflow-hidden hover:border-primary/40 transition-all group cursor-pointer"
          >
            <div className="relative aspect-[3/4] overflow-hidden">
              <img src={manga.cover} alt={manga.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <Badge className={
                  manga.status === "Em publicação" ? "bg-primary/90 text-primary-foreground border-none text-[10px]" :
                  manga.status === "Hiato" ? "bg-chart-4/90 text-primary-foreground border-none text-[10px]" :
                  "bg-secondary/90 text-secondary-foreground border-none text-[10px]"
                }>
                  {manga.status}
                </Badge>
              </div>
            </div>
            <div className="p-3">
              <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">{manga.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{manga.genre}</p>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1 text-xs text-chart-4">
                  <Star className="w-3 h-3 fill-chart-4" /> {manga.rating}
                </div>
                <span className="text-[10px] text-muted-foreground">{manga.chaptersLabel}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <MediaDrawer
        media={selected}
        type="manga"
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}