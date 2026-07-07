import { useState, useRef, useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";

// Textarea with @mention autocomplete.
// profiles: UserProfile[] (already loaded by parent).
// currentEmail: the author's email (excluded from suggestions).
export default function MentionTextarea({ value, onChange, placeholder, className, profiles = [], currentEmail }) {
  const navigate = useNavigate();
  const ref = useRef(null);
  const [query, setQuery] = useState(null); // string after "@" or null

  const suggestions = useMemo(() => {
    if (query == null) return [];
    const q = query.toLowerCase();
    return profiles
      .filter(p => p.user_email !== currentEmail && p.username)
      .filter(p => p.username.toLowerCase().includes(q))
      .slice(0, 6);
  }, [query, profiles, currentEmail]);

  function handleChange(e) {
    const val = e.target.value;
    onChange(val);
    // Detect "@" query at cursor
    const caret = e.target.selectionStart;
    const before = val.slice(0, caret);
    const match = before.match(/(?:^|\s)@([\w.]*)$/);
    if (match) {
      setQuery(match[1]);
    } else {
      setQuery(null);
    }
  }

  function insertMention(username) {
    const el = ref.current;
    const caret = el ? el.selectionStart : value.length;
    const before = value.slice(0, caret);
    const after = value.slice(caret);
    // Replace the partial "@query" at the end of `before`
    const replaced = before.replace(/(@[\w.]*)$/, `@${username} `);
    const next = replaced + after;
    onChange(next);
    setQuery(null);
    // Restore focus
    requestAnimationFrame(() => {
      if (el) {
        const pos = replaced.length;
        el.focus();
        el.setSelectionRange(pos, pos);
      }
    });
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") setQuery(null);
  }

  function handleBlur() {
    // Delay so click on suggestion registers
    setTimeout(() => setQuery(null), 150);
  }

  return (
    <div className="relative flex-1">
      <Textarea
        ref={ref}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={className}
      />
      {suggestions.length > 0 && (
        <div className="absolute z-50 bottom-full mb-1 left-0 right-0 sm:right-auto sm:w-64 bg-popover border border-border rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {suggestions.map(p => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertMention(p.username); }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-secondary/60 transition-colors text-left"
            >
              <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 overflow-hidden">
                {p.avatar_url
                  ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                  : (p.username || "A")[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{p.username}</p>
                {p.display_name && <p className="text-[10px] text-muted-foreground truncate">{p.display_name}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}