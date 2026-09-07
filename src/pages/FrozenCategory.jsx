import { Snowflake } from "lucide-react";
import { Link } from "react-router-dom";

const LABELS = {
  manga: "Mangás",
  movie: "Filmes",
  liveaction: "Live-Action",
};

export default function FrozenCategory({ category }) {
  const label = LABELS[category] || "Esta área";

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
        <Snowflake className="w-8 h-8 text-muted-foreground" />
      </div>
      <h1 className="font-space font-bold text-2xl text-foreground mb-2">
        {label} temporariamente indisponível
      </h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
        Estamos focando apenas em anime por enquanto. Esta área será reativada no futuro.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
      >
        Voltar ao início
      </Link>
    </div>
  );
}