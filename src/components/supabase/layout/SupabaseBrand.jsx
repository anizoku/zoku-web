export default function SupabaseBrand({ collapsed = false }) {
  // No local logo assets exist. Keep the app's text branding until approved
  // local Zoku logos are supplied; do not mount the legacy SiteConfig hook.
  return <>
    <span aria-hidden="true" className="w-8 h-8 flex items-center justify-center shrink-0 font-space text-2xl font-bold text-primary">Z</span>
    {!collapsed && <span className="font-space text-2xl leading-6 font-bold text-primary">Zoku</span>}
  </>;
}
