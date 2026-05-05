import { useEffect } from 'react';
import { shouldRefreshImages, setImageRefreshTime } from '@/lib/imageCache';

export function useAutoImageRefresh() {
  useEffect(() => {
    if (!shouldRefreshImages()) return;

    // Schedule refresh in 1 hour
    const timeout = setTimeout(() => {
      setImageRefreshTime();
      // Clear image cache by removing all image cache entries
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('img_cache_')) {
            localStorage.removeItem(key);
          }
        });
      } catch {}
      // Reload current page to show updated images
      window.location.reload();
    }, 60 * 60 * 1000); // 1 hour

    return () => clearTimeout(timeout);
  }, []);
}