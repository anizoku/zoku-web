export const categoryLabels = {
  anime: "Anime",
  manga: "Mangá",
  movie: "Filme",
  liveaction: "Live Action",
  general: "Geral",
};

export const newsCategories = [
  { key: "all", label: "Todas" },
  { key: "anime", label: "Anime" },
  { key: "manga", label: "Mangá" },
  { key: "movie", label: "Filme" },
  { key: "liveaction", label: "Live Action" },
  { key: "general", label: "Geral" },
];

// Categorias válidas para criação (sem "Todas")
export const newsCategoryOptions = [
  { key: "anime", label: "Anime" },
  { key: "manga", label: "Mangá" },
  { key: "movie", label: "Filme" },
  { key: "liveaction", label: "Live Action" },
  { key: "general", label: "Geral" },
];

// Imagem preferida para cada contexto, com fallback em image_url (legado)
export function getCardImage(n) {
  return n?.card_image_url || n?.image_url || "";
}
export function getBannerImage(n) {
  return n?.banner_image_url || n?.image_url || "";
}
export function getArticleImage(n) {
  return n?.article_image_url || n?.image_url || "";
}

export function slugify(text) {
  return (text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function computeReadingMinutes(content) {
  const words = (content || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function formatDatePT(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function timeAgo(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return "agora";
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min}min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `há ${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `há ${day}d`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `há ${wk}sem`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `há ${mo}mês`;
  const yr = Math.floor(day / 365);
  return `há ${yr}ano`;
}