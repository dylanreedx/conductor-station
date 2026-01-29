import type { CacheEntry, CacheStats } from './types';

/**
 * Query result cache with TTL and source-based invalidation
 */
class QueryCache {
	private cache = new Map<string, CacheEntry<unknown>>();
	private defaultTTL: number = 30_000; // 30 seconds
	private hits = 0;
	private misses = 0;

	/**
	 * Generate a cache key from query type and parameters
	 */
	makeKey(query: string, params?: object): string {
		if (!params || Object.keys(params).length === 0) {
			return query;
		}
		// Sort keys for consistent key generation
		const sortedParams = JSON.stringify(params, Object.keys(params).sort());
		return `${query}:${sortedParams}`;
	}

	/**
	 * Get a cached result (returns undefined if expired or missing)
	 */
	get<T>(key: string): T | undefined {
		const entry = this.cache.get(key);

		if (!entry) {
			this.misses++;
			return undefined;
		}

		// Check TTL
		if (Date.now() - entry.timestamp > entry.ttl) {
			this.cache.delete(key);
			this.misses++;
			return undefined;
		}

		this.hits++;
		return entry.data as T;
	}

	/**
	 * Set a cache entry
	 */
	set<T>(key: string, data: T, options?: { ttl?: number; invalidatedBy?: string[] }): void {
		this.cache.set(key, {
			data,
			timestamp: Date.now(),
			ttl: options?.ttl ?? this.defaultTTL,
			invalidatedBy: options?.invalidatedBy ?? []
		});
	}

	/**
	 * Check if a key exists and is not expired
	 */
	has(key: string): boolean {
		const entry = this.cache.get(key);
		if (!entry) return false;
		if (Date.now() - entry.timestamp > entry.ttl) {
			this.cache.delete(key);
			return false;
		}
		return true;
	}

	/**
	 * Invalidate all entries that depend on the specified source aliases
	 */
	invalidateBySource(aliases: string[]): number {
		if (aliases.length === 0) return 0;

		let invalidated = 0;
		const aliasSet = new Set(aliases);

		for (const [key, entry] of this.cache.entries()) {
			// Invalidate if:
			// 1. Entry has no specific sources (global query) - invalidate on any change
			// 2. Entry depends on one of the changed aliases
			if (entry.invalidatedBy.length === 0 || entry.invalidatedBy.some((a) => aliasSet.has(a))) {
				this.cache.delete(key);
				invalidated++;
			}
		}

		return invalidated;
	}

	/**
	 * Invalidate entries matching a key prefix
	 */
	invalidateByPrefix(prefix: string): number {
		let invalidated = 0;

		for (const key of this.cache.keys()) {
			if (key.startsWith(prefix)) {
				this.cache.delete(key);
				invalidated++;
			}
		}

		return invalidated;
	}

	/**
	 * Delete a specific cache entry
	 */
	delete(key: string): boolean {
		return this.cache.delete(key);
	}

	/**
	 * Clear all cache entries
	 */
	clear(): void {
		this.cache.clear();
		this.hits = 0;
		this.misses = 0;
	}

	/**
	 * Get cache statistics
	 */
	stats(): CacheStats {
		const total = this.hits + this.misses;
		return {
			size: this.cache.size,
			hits: this.hits,
			misses: this.misses,
			hitRate: total > 0 ? this.hits / total : 0
		};
	}

	/**
	 * Set the default TTL for new entries
	 */
	setDefaultTTL(ttl: number): void {
		this.defaultTTL = ttl;
	}

	/**
	 * Get the default TTL
	 */
	getDefaultTTL(): number {
		return this.defaultTTL;
	}

	/**
	 * Clean up expired entries (can be called periodically)
	 */
	cleanup(): number {
		const now = Date.now();
		let cleaned = 0;

		for (const [key, entry] of this.cache.entries()) {
			if (now - entry.timestamp > entry.ttl) {
				this.cache.delete(key);
				cleaned++;
			}
		}

		return cleaned;
	}
}

// Export singleton instance
export const queryCache = new QueryCache();
