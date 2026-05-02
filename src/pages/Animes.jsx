import { Tv } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getByCategory } from "@/lib/catalog";
import CatalogCard from "@/components/catalog/CatalogCard";

const animes = getByCategory("anime");

export default function Animes() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const filtered = animes.filter((a) =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.genres.some((g) => g.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-chart-2/10 flex items-center justify-center">
            <Tv className="w-5 h-5 text-chart-2" />
          </div>
          <div>
            <h1 className="font-space font-bold text-2xl text-foreground">Animes</h1>
            <p className="text-sm text-muted-foreground">{animes.length} séries no catálogo</p>
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
        {filtered.map((anime) => (
          <CatalogCard
            key={anime.slug}
            item={anime}
            filterCategory="anime"
            onClick={(item) => navigate(`/obra/${item.slug}?tipo=anime`)}
          />
        ))}
      </div>
    </div>
  );
}