interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

export interface CacheState<T> {
  isExpired: boolean;
  value: T;
}

export class MemoryCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): T | null {
    const entry = this.getEntry(key);
    if (!entry || entry.isExpired) {
      return null;
    }

    return entry.value;
  }

  getEntry(key: string): CacheState<T> | null {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    return {
      value: entry.value,
      isExpired: Date.now() > entry.expiresAt
    };
  }

  set(key: string, value: T): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs
    });
  }
}
