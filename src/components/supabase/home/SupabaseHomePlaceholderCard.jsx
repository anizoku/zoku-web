import { useId } from 'react';

// Deliberate empty states, not loading skeletons: these modules have no migrated data source.
export default function SupabaseHomePlaceholderCard({ title, icon: Icon, children }) {
  const titleId = useId();
  return <section aria-labelledby={titleId} className="min-w-0 rounded-xl border border-border bg-card p-4">
    <div className="mb-4 flex items-center gap-2"><Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" /><h2 id={titleId} className="font-space text-sm font-semibold">{title}</h2></div>
    <div className="flex min-h-24 items-center justify-center rounded-lg bg-secondary/20 px-3 py-5 text-center text-xs leading-relaxed text-muted-foreground">{children}</div>
  </section>;
}
