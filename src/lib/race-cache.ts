import { RecentRace } from '@/lib/iracing/types';

const CACHE_KEY = 'iracing-v3-ng-races';
const STALE_MS = 2 * 60 * 60 * 1000; // 2 hours — triggers an incremental update

interface CacheEntry {
  custId: number;
  fetchedAt: number; // Unix ms
  races: RecentRace[];
}

export interface RaceCacheEntry {
  races: RecentRace[];
  fetchedAt: number;
  isStale: boolean;
  /** ISO string of the latest sessionStartTime in the cache, minus 1 day buffer. */
  incrementalStartDate: string;
}

function read(): CacheEntry | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CacheEntry) : null;
  } catch {
    return null;
  }
}

function write(entry: CacheEntry): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // localStorage full — fail silently, data will just be re-fetched next time
  }
}

/**
 * Returns the full cache entry for this custId, ignoring the TTL.
 * The caller uses `isStale` to decide whether to do an incremental fetch.
 * Returns null if no cache exists for this custId.
 */
export function getFullCacheEntry(custId: number): RaceCacheEntry | null {
  const entry = read();
  if (!entry || entry.custId !== custId) return null;

  const isStale = Date.now() - entry.fetchedAt > STALE_MS;

  // Find the latest sessionStartTime and step back 1 day as a buffer for
  // races whose results are still being processed by iRacing at fetch time.
  const latestMs = entry.races.reduce((max, r) => {
    const t = new Date(r.sessionStartTime).getTime();
    return isNaN(t) ? max : Math.max(max, t);
  }, 0);
  const bufferMs = 24 * 60 * 60 * 1000;
  const incrementalStartDate = new Date(
    latestMs > 0 ? latestMs - bufferMs : Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  return { races: entry.races, fetchedAt: entry.fetchedAt, isStale, incrementalStartDate };
}

export function setCachedRaces(custId: number, races: RecentRace[]): void {
  write({ custId, fetchedAt: Date.now(), races });
}

export function clearRaceCache(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CACHE_KEY);
}

/**
 * Returns the fetchedAt timestamp if a fresh (non-stale) cache exists, otherwise null.
 * Used by the Header to display the "X minutes ago" indicator.
 */
export function getCacheFetchedAt(custId: number): number | null {
  const entry = read();
  if (!entry || entry.custId !== custId) return null;
  if (Date.now() - entry.fetchedAt > STALE_MS) return null;
  return entry.fetchedAt;
}
