import { BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { getByCategory } from "@/lib/catalog";
import CatalogCard from "@/components/catalog/CatalogCard";
import MediaDrawer from "@/components/media/MediaDrawer";

const mangas = getByCategory("manga");

export default function Mangas() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const filtered = mangas.filter((m) =>
    m.title.toLowerCase().includes(search.toLowerCase()) ||
    m.genres.some((g) => g.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-chart-3/10 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-chart-3" />
          </div>
          <div>
            <h1 className="font-space font-bold text-2xl text-foreground">Mangás</h1>
            <p className="text-sm text-muted-foreground">{mangas.length} obras no catálogo</p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Buscar por título ou gênero..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm bg-secondary border-none"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filtered.map((manga) => (
          <CatalogCard
            key={manga.slug}
            item={manga}
            filterCategory="manga"
            onClick={setSelected}
          />
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