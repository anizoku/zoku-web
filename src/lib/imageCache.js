const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
const CACHE_KEY_PREFIX = "img_cache_";
const LAST_REFRESH_KEY = "last_image_refresh";

function getCacheKey(url) {
  return CACHE_KEY_PREFIX + btoa(url);
}

export function getCachedImageUrl(url) {
  if (!url) return null;
  try {
    const cached = localStorage.getItem(getCacheKey(url));
    if (cached) {
      const { data, ts } = JSON.parse(cached);
      if (Date.now() - ts < CACHE_DURATION) {
        return data;
      }
    }
  } catch {}
  return null;
}

export function setCachedImageUrl(url, dataUrl) {
  try {
    localStorage.setItem(getCacheKey(url), JSON.stringify({ data: dataUrl, ts: Date.now() }));
  } catch {}
}

export function shouldRefreshImages() {
  try {
    const lastRefresh = localStorage.getItem(LAST_REFRESH_KEY);
    if (!lastRefresh) return true;
    const lastTime = parseInt(lastRefresh, 10);
    return Date.now() - lastTime >= CACHE_DURATION;
  } catch {}
  return true;
}

export function setImageRefreshTime() {
  try {
    localStorage.setItem(LAST_REFRESH_KEY, Date.now().toString());
  } catch {}
}