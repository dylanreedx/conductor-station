import { statSync, existsSync } from 'fs';
import { getActiveDatabases, getDatabasesMeta, updateMtime } from './connection';
import { queryCache } from './cache';
import type { SyncState, DatabaseMeta } from './types';

type ChangeListener = (changedAliases: string[]) => void;

/**
 * Sync engine that polls databases for changes and invalidates cache
 */
class SyncEngine {
	private defaultInterval: number = 120_000; // 2 minutes
	private liveInterval: number = 5_000; // 5 seconds
	private isLive: boolean = false;
	private intervalId: ReturnType<typeof setInterval> | null = null;
	private listeners = new Set<ChangeListener>();
	private lastSync: number = 0;
	private dbMtimes = new Map<string, number>(); // path -> last known mtime

	/**
	 * Initialize the sync engine with config
	 */
	configure(options: { defaultInterval?: number; liveInterval?: number; cacheTTL?: number }): void {
		if (options.defaultInterval) {
			this.defaultInterval = options.defaultInterval;
		}
		if (options.liveInterval) {
			this.liveInterval = options.liveInterval;
		}
		if (options.cacheTTL) {
			queryCache.setDefaultTTL(options.cacheTTL);
		}
	}

	/**
	 * Start the polling interval
	 */
	start(): void {
		this.stop();
		const interval = this.isLive ? this.liveInterval : this.defaultInterval;
		this.intervalId = setInterval(() => this.tick(), interval);
		// Immediate first check
		this.tick();
	}

	/**
	 * Stop the polling interval
	 */
	stop(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}

	/**
	 * Toggle live mode (5 second polling)
	 */
	setLiveMode(enabled: boolean): void {
		if (this.isLive !== enabled) {
			this.isLive = enabled;
			// Restart with new interval if currently running
			if (this.intervalId) {
				this.start();
			}
		}
	}

	/**
	 * Check if live mode is enabled
	 */
	isLiveMode(): boolean {
		return this.isLive;
	}

	/**
	 * Poll tick - check for changes
	 */
	private async tick(): Promise<void> {
		const changes = await this.checkForChanges();
		if (changes.length > 0) {
			// Invalidate cache entries for changed databases
			const invalidated = queryCache.invalidateBySource(changes);
			console.log(
				`[SyncEngine] Detected changes in: ${changes.join(', ')} - invalidated ${invalidated} cache entries`
			);
			// Notify listeners
			this.emit(changes);
		}
		this.lastSync = Date.now();
	}

	/**
	 * Check all databases for mtime changes
	 * Returns aliases of databases that have changed
	 */
	async checkForChanges(): Promise<string[]> {
		const changed: string[] = [];
		const databases = getActiveDatabases();

		for (const { meta } of databases) {
			if (!existsSync(meta.path)) continue;

			try {
				const stat = statSync(meta.path);
				const currentMtime = stat.mtimeMs;
				const lastMtime = this.dbMtimes.get(meta.path);

				// If we have a previous mtime and it's different, the DB changed
				if (lastMtime !== undefined && currentMtime > lastMtime) {
					changed.push(meta.alias);
					// Update the connection's mtime
					updateMtime(meta.path);
				}

				// Store current mtime
				this.dbMtimes.set(meta.path, currentMtime);
			} catch {
				// Error reading file - skip
			}
		}

		return changed;
	}

	/**
	 * Subscribe to change events
	 * Returns unsubscribe function
	 */
	onChange(callback: ChangeListener): () => void {
		this.listeners.add(callback);
		return () => this.listeners.delete(callback);
	}

	/**
	 * Emit change event to all listeners
	 */
	private emit(changes: string[]): void {
		for (const listener of this.listeners) {
			try {
				listener(changes);
			} catch (error) {
				console.error('[SyncEngine] Error in change listener:', error);
			}
		}
	}

	/**
	 * Get current sync state
	 */
	getState(): SyncState {
		const databases = getDatabasesMeta();

		return {
			databases: databases.map(
				(db): DatabaseMeta => ({
					path: db.path,
					alias: db.alias,
					mtime: this.dbMtimes.get(db.path) ?? db.mtime,
					lastChecked: this.lastSync,
					projectCount: db.projectCount,
					isValid: db.isValid
				})
			),
			lastSync: this.lastSync,
			isLiveMode: this.isLive,
			pollInterval: this.isLive ? this.liveInterval : this.defaultInterval
		};
	}

	/**
	 * Force an immediate sync check
	 */
	async forceSync(): Promise<string[]> {
		return this.tick().then(() => []);
	}

	/**
	 * Initialize mtime tracking for all current databases.
	 * Clears stale entries first so rescans don't leave old paths in the map.
	 */
	initializeMtimes(): void {
		this.dbMtimes.clear();
		const databases = getActiveDatabases();
		for (const { meta } of databases) {
			if (existsSync(meta.path)) {
				try {
					const stat = statSync(meta.path);
					this.dbMtimes.set(meta.path, stat.mtimeMs);
				} catch {
					// Skip
				}
			}
		}
	}

	/**
	 * Clear mtime tracking (useful when databases are rescanned)
	 */
	clearMtimes(): void {
		this.dbMtimes.clear();
	}

	/**
	 * Get current poll interval
	 */
	getPollInterval(): number {
		return this.isLive ? this.liveInterval : this.defaultInterval;
	}
}

// Export singleton instance
export const syncEngine = new SyncEngine();
