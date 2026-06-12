import { useEffect } from "react";

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `ZOKU — ${title}` : "ZOKU";
    return () => { document.title = "ZOKU"; };
  }, [title]);
}