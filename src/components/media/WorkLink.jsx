import { useNavigate } from "react-router-dom";
import { useCatalog } from "@/contexts/CatalogContext";

/**
 * Renders a clickable work title that navigates to /obra/:slug
 * If no matching catalog entry found, renders as plain text.
 */
export default function WorkLink({ title, className = "", prefix = "" }) {
  const navigate = useNavigate();
  const { catalog } = useCatalog();
  if (!title) return null;

  const entry = catalog.find(c => c.title.toLowerCase() === title.toLowerCase());

  if (!entry) {
    return <span className={className}>{prefix}{title}</span>;
  }

  const tipo = entry.categories?.[0] || "anime";

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/obra/${entry.slug}?tipo=${tipo}`);
      }}
      className={`hover:underline text-left ${className}`}
    >
      {prefix}{title}
    </button>
  );
}