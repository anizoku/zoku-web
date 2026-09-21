import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

const SECTION_MAP = {
  obras: "Obras",
  noticias: "Notícias",
  communities: "Comunidades",
  u: "Perfis",
  obra: "Obra",
  ranking: "Ranking",
  recomendacoes: "Recomendações",
  events: "Eventos",
  friends: "Amigos",
  messages: "Mensagens",
  "my-list": "Minha Lista",
  profile: "Perfil",
  trending: "Em Alta",
  admin: "Admin",
};

// Rótulo genérico para o último segmento dinâmico (slug/id/email)
const DETAIL_LABEL = {
  obra: "Obra",
  noticias: "Artigo",
  communities: "Comunidade",
  u: "Perfil",
};

export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null; // home: sem trilha

  const crumbs = [];
  let acc = "";
  segments.forEach((seg, i) => {
    acc += "/" + seg;
    const isLast = i === segments.length - 1;
    const prev = segments[i - 1];
    let label;
    if (SECTION_MAP[seg]) {
      label = SECTION_MAP[seg];
    } else if (isLast) {
      label = DETAIL_LABEL[prev] || "Detalhe";
    } else {
      label = seg;
    }
    crumbs.push({ to: acc, label, isLast });
  });

  return (
    <nav aria-label="Trilha de navegação" className="px-4 lg:px-6 pt-3 pb-1">
      <ol className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
        <li>
          <Link
            to="/"
            className="hover:text-foreground inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
          >
            <Home className="w-3 h-3" /> Início
          </Link>
        </li>
        {crumbs.map((c) => (
          <li key={c.to} className="flex items-center gap-1 min-w-0">
            <ChevronRight className="w-3 h-3 shrink-0" />
            {c.isLast ? (
              <span className="text-foreground font-medium truncate max-w-[200px]">{c.label}</span>
            ) : (
              <Link
                to={c.to}
                className="hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded truncate"
              >
                {c.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
