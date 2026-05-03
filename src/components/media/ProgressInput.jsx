import { useState, useRef } from "react";

/**
 * Inline progress input with "EP | 31" or "CP | 450" visual.
 * Confirms on Enter or blur. Calls onConfirm(newValue: number).
 */
export default function ProgressInput({ current, total, prefix, onConfirm, disabled }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  function startEdit() {
    if (disabled) return;
    setDraft(String(current));
    setEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }

  function commit() {
    const val = parseInt(draft, 10);
    if (!isNaN(val) && val >= 0 && val !== current) {
      onConfirm(val);
    }
    setEditing(false);
  }

  function handleKey(e) {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center h-8 rounded-lg border border-primary/50 bg-input overflow-hidden text-xs font-mono">
        <span className="px-2 text-primary font-bold select-none border-r border-border shrink-0">{prefix}</span>
        <input
          ref={inputRef}
          type="number"
          min={0}
          max={total || 99999}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKey}
          className="flex-1 bg-transparent px-2 text-foreground outline-none w-16 min-w-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        {total > 0 && (
          <span className="pr-2 text-muted-foreground shrink-0">/ {total}</span>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={startEdit}
      disabled={disabled}
      title={`Clique para editar o progresso (${prefix} ${current})`}
      className="flex items-center h-8 rounded-lg border border-border bg-input hover:border-primary/40 hover:bg-input/80 transition-all text-xs font-mono cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
    >
      <span className="px-2 text-primary font-bold select-none border-r border-border shrink-0">{prefix}</span>
      <span className="px-2 text-foreground">
        {current > 0 ? current : <span className="text-muted-foreground">—</span>}
      </span>
    </button>
  );
}