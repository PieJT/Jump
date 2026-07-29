// Caches the representative thumbnail fetched for each hardcoded Home-screen
// recommendation (playlists + artists in lib/recommendations.ts) so we don't
// re-run a search Worker request for the same fixed query on every load.

const CACHE_KEY = "aura:recThumbs";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days — recommendations are static, but this avoids ever going fully stale

interface CacheEntry {
  thumb: string;
  ts: number;
}

type ThumbCache = Record<string, CacheEntry>;

export function loadThumbCache(): ThumbCache {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ThumbCache;
  } catch {
    return {};
  }
}

export function saveThumbCache(cache: ThumbCache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore quota/serialization errors — worst case we just refetch next time.
  }
}

/** Returns only the entries that haven't expired yet, as a plain seed -> thumb map. */
export function getFreshThumbs(cache: ThumbCache): Record<string, string> {
  const now = Date.now();
  const fresh: Record<string, string> = {};
  for (const [seed, entry] of Object.entries(cache)) {
    if (now - entry.ts < TTL_MS) fresh[seed] = entry.thumb;
  }
  return fresh;
}

export function mergeAndPersist(cache: ThumbCache, updates: Record<string, string>): ThumbCache {
  const now = Date.now();
  const next: ThumbCache = { ...cache };
  for (const [seed, thumb] of Object.entries(updates)) {
    next[seed] = { thumb, ts: now };
  }
  saveThumbCache(next);
  return next;
}