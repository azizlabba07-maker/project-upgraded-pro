// src/lib/Cache.ts
// Simple wrapper around localStorage with TTL (time‑to‑live) support.
// All values are stored as JSON strings.

interface CacheEntry<T> {
  value: T;
  expiresAt: number; // epoch ms when the entry becomes stale
}

export class Cache {
  private static prefix = "__cache__";

  /**
   * Store a value under the given key for a limited time.
   * @param key   Unique cache key.
   * @param value Value to store (will be JSON‑stringified).
   * @param ttlMs Time‑to‑live in milliseconds.
   */
  static set<T>(key: string, value: T, ttlMs: number): void {
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + ttlMs,
    };
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(entry));
    } catch (e) {
      console.warn("Cache set failed:", e);
    }
  }

  /** Retrieve a cached value if it exists and is not expired. */
  static get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      if (!raw) return null;
      const entry: CacheEntry<T> = JSON.parse(raw);
      if (Date.now() > entry.expiresAt) {
        // stale – remove it
        localStorage.removeItem(this.prefix + key);
        return null;
      }
      return entry.value;
    } catch (e) {
      console.warn("Cache get failed:", e);
      return null;
    }
  }

  /** Returns true if a non‑stale entry exists for the key. */
  static has(key: string): boolean {
    return this.get(key) !== null;
  }

  /** Clear all entries that belong to this cache namespace. */
  static clear(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(this.prefix)) keysToRemove.push(k);
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      console.warn("Cache clear failed:", e);
    }
  }
}

export default Cache;
