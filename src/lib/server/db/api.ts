import {
	getActiveDatabases,
	getDatabase,
	openDatabase,
	closeAll,
	getDatabasesMeta
} from './connection';
import { discoverDatabases, discoverDatabasesDetailed } from './discovery';
import { queryCache } from './cache';
import { syncEngine } from './sync';
import type {
	Project,
	Session,
	Feature,
	Memory,
	QualityReflection,
	AggregatedProject,
	AggregatedSession,
	AggregatedFeature,
	AggregatedMemory,
	AggregatedQualityReflection,
	ProjectFilters,
	FeatureFilters,
	SessionFilters,
	MemoryFilters,
	QualityFilters,
	DashboardStats,
	SyncState,
	Config
} from './types';

type DataChangeListener = () => void;

/**
 * Unified API for querying aggregated Conductor databases
 */
class ConductorAPI {
	private changeListeners = new Set<DataChangeListener>();
	private initialized = false;

	/**
	 * Initialize the API with databases from config
	 */
	initialize(config: Config): void {
		if (this.initialized) {
			this.shutdown();
		}

		// Discover and open databases
		const dbPaths = discoverDatabases(config.scanPaths, config.excludePatterns, config.scanDepth);

		for (const path of dbPaths) {
			try {
				openDatabase(path);
			} catch (error) {
				console.error(`[ConductorAPI] Failed to open database: ${path}`, error);
			}
		}

		// Configure sync engine
		syncEngine.configure({
			defaultInterval: config.sync.defaultInterval,
			liveInterval: config.sync.liveInterval,
			cacheTTL: config.sync.cacheTTL
		});

		// Initialize mtime tracking
		syncEngine.initializeMtimes();

		// Subscribe to changes to notify our listeners
		syncEngine.onChange(() => {
			this.notifyListeners();
		});

		// Start polling
		syncEngine.start();

		this.initialized = true;
		console.log(`[ConductorAPI] Initialized with ${dbPaths.length} databases`);
	}

	/**
	 * Shutdown the API
	 */
	shutdown(): void {
		syncEngine.stop();
		closeAll();
		queryCache.clear();
		this.initialized = false;
	}

	/**
	 * Check if initialized
	 */
	isInitialized(): boolean {
		return this.initialized;
	}

	// ===================
	// PROJECTS
	// ===================

	/**
	 * Get all projects across all databases
	 */
	getProjects(filters?: ProjectFilters): AggregatedProject[] {
		const cacheKey = queryCache.makeKey('projects', filters);
		const cached = queryCache.get<AggregatedProject[]>(cacheKey);
		if (cached) return cached;

		const results: AggregatedProject[] = [];
		const databases = filters?.sourceAlias
			? [getDatabase(filters.sourceAlias)].filter(Boolean)
			: getActiveDatabases();

		for (const conn of databases) {
			if (!conn) continue;

			let sql = 'SELECT * FROM projects WHERE 1=1';
			const params: unknown[] = [];

			if (filters?.projectType) {
				sql += ' AND project_type = ?';
				params.push(filters.projectType);
			}
			if (filters?.search) {
				sql += ' AND name LIKE ?';
				params.push(`%${filters.search}%`);
			}

			sql += ' ORDER BY created_at DESC';

			try {
				const projects = conn.db.prepare(sql).all(...params) as Project[];

				for (const project of projects) {
					results.push({
						...project,
						_id: `${conn.meta.alias}:${project.id}`,
						_displayName: `${project.name} (${conn.meta.alias})`,
						_sourceDb: conn.meta.path,
						_sourceAlias: conn.meta.alias
					});
				}
			} catch (error) {
				console.error(`[ConductorAPI] Error querying projects from ${conn.meta.alias}:`, error);
			}
		}

		// Cache with source tracking
		const sources = filters?.sourceAlias
			? [filters.sourceAlias]
			: databases.map((d) => d!.meta.alias);

		queryCache.set(cacheKey, results, { invalidatedBy: sources });

		return results;
	}

	/**
	 * Get a single project by composite ID
	 */
	getProject(compositeId: string): AggregatedProject | null {
		const [alias, id] = this.parseCompositeId(compositeId);
		const conn = getDatabase(alias);
		if (!conn) return null;

		try {
			const project = conn.db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as
				| Project
				| undefined;

			if (!project) return null;

			return {
				...project,
				_id: compositeId,
				_displayName: `${project.name} (${conn.meta.alias})`,
				_sourceDb: conn.meta.path,
				_sourceAlias: conn.meta.alias
			};
		} catch {
			return null;
		}
	}

	// ===================
	// FEATURES
	// ===================

	/**
	 * Get features across all databases
	 */
	getFeatures(filters?: FeatureFilters): AggregatedFeature[] {
		const cacheKey = queryCache.makeKey('features', filters);
		const cached = queryCache.get<AggregatedFeature[]>(cacheKey);
		if (cached) return cached;

		const results: AggregatedFeature[] = [];

		// Determine which databases to query
		let databases = getActiveDatabases();
		let projectIdFilter: string | undefined;

		if (filters?.sourceAlias) {
			const conn = getDatabase(filters.sourceAlias);
			databases = conn ? [conn] : [];
		}

		if (filters?.projectId) {
			const [alias, id] = this.parseCompositeId(filters.projectId);
			const conn = getDatabase(alias);
			databases = conn ? [conn] : [];
			projectIdFilter = id;
		}

		for (const conn of databases) {
			let sql = 'SELECT * FROM features WHERE 1=1';
			const params: unknown[] = [];

			if (projectIdFilter) {
				sql += ' AND project_id = ?';
				params.push(projectIdFilter);
			}
			if (filters?.status) {
				sql += ' AND status = ?';
				params.push(filters.status);
			}
			if (filters?.phase !== undefined) {
				sql += ' AND phase = ?';
				params.push(filters.phase);
			}
			if (filters?.category) {
				sql += ' AND category = ?';
				params.push(filters.category);
			}
			if (filters?.search) {
				sql += ' AND description LIKE ?';
				params.push(`%${filters.search}%`);
			}

			sql += ' ORDER BY phase ASC, priority DESC, updated_at DESC';

			if (filters?.limit) {
				sql += ' LIMIT ?';
				params.push(filters.limit);
				if (filters.offset) {
					sql += ' OFFSET ?';
					params.push(filters.offset);
				}
			}

			try {
				const features = conn.db.prepare(sql).all(...params) as Feature[];

				for (const feature of features) {
					results.push({
						...feature,
						_id: `${conn.meta.alias}:${feature.id}`,
						_projectId: `${conn.meta.alias}:${feature.project_id}`,
						_sourceDb: conn.meta.path,
						_sourceAlias: conn.meta.alias
					});
				}
			} catch (error) {
				console.error(`[ConductorAPI] Error querying features from ${conn.meta.alias}:`, error);
			}
		}

		const sources = databases.map((d) => d.meta.alias);
		queryCache.set(cacheKey, results, { invalidatedBy: sources });

		return results;
	}

	/**
	 * Get a single feature by composite ID
	 */
	getFeature(compositeId: string): AggregatedFeature | null {
		const [alias, id] = this.parseCompositeId(compositeId);
		const conn = getDatabase(alias);
		if (!conn) return null;

		try {
			const feature = conn.db.prepare('SELECT * FROM features WHERE id = ?').get(id) as
				| Feature
				| undefined;

			if (!feature) return null;

			return {
				...feature,
				_id: compositeId,
				_projectId: `${conn.meta.alias}:${feature.project_id}`,
				_sourceDb: conn.meta.path,
				_sourceAlias: conn.meta.alias
			};
		} catch {
			return null;
		}
	}

	// ===================
	// SESSIONS
	// ===================

	/**
	 * Get sessions across all databases
	 */
	getSessions(filters?: SessionFilters): AggregatedSession[] {
		const cacheKey = queryCache.makeKey('sessions', filters);
		const cached = queryCache.get<AggregatedSession[]>(cacheKey);
		if (cached) return cached;

		const results: AggregatedSession[] = [];

		let databases = getActiveDatabases();
		let projectIdFilter: string | undefined;

		if (filters?.sourceAlias) {
			const conn = getDatabase(filters.sourceAlias);
			databases = conn ? [conn] : [];
		}

		if (filters?.projectId) {
			const [alias, id] = this.parseCompositeId(filters.projectId);
			const conn = getDatabase(alias);
			databases = conn ? [conn] : [];
			projectIdFilter = id;
		}

		for (const conn of databases) {
			let sql = 'SELECT * FROM sessions WHERE 1=1';
			const params: unknown[] = [];

			if (projectIdFilter) {
				sql += ' AND project_id = ?';
				params.push(projectIdFilter);
			}
			if (filters?.status) {
				sql += ' AND status = ?';
				params.push(filters.status);
			}

			sql += ' ORDER BY started_at DESC';

			if (filters?.limit) {
				sql += ' LIMIT ?';
				params.push(filters.limit);
			}

			try {
				const sessions = conn.db.prepare(sql).all(...params) as Session[];

				for (const session of sessions) {
					results.push({
						...session,
						_id: `${conn.meta.alias}:${session.id}`,
						_projectId: `${conn.meta.alias}:${session.project_id}`,
						_sourceDb: conn.meta.path,
						_sourceAlias: conn.meta.alias
					});
				}
			} catch (error) {
				console.error(`[ConductorAPI] Error querying sessions from ${conn.meta.alias}:`, error);
			}
		}

		const sources = databases.map((d) => d.meta.alias);
		queryCache.set(cacheKey, results, { invalidatedBy: sources });

		return results;
	}

	// ===================
	// MEMORIES
	// ===================

	/**
	 * Get memories across all databases
	 */
	getMemories(filters?: MemoryFilters): AggregatedMemory[] {
		const cacheKey = queryCache.makeKey('memories', filters);
		const cached = queryCache.get<AggregatedMemory[]>(cacheKey);
		if (cached) return cached;

		const results: AggregatedMemory[] = [];

		let databases = getActiveDatabases();
		let projectIdFilter: string | undefined;

		if (filters?.sourceAlias) {
			const conn = getDatabase(filters.sourceAlias);
			databases = conn ? [conn] : [];
		}

		if (filters?.projectId) {
			const [alias, id] = this.parseCompositeId(filters.projectId);
			const conn = getDatabase(alias);
			databases = conn ? [conn] : [];
			projectIdFilter = id;
		}

		for (const conn of databases) {
			let sql = 'SELECT * FROM memories WHERE 1=1';
			const params: unknown[] = [];

			if (projectIdFilter) {
				sql += ' AND project_id = ?';
				params.push(projectIdFilter);
			}

			sql += ' ORDER BY created_at DESC';

			if (filters?.limit) {
				sql += ' LIMIT ?';
				params.push(filters.limit);
			}

			try {
				const memories = conn.db.prepare(sql).all(...params) as Memory[];

				for (const memory of memories) {
					const parsedTags = memory.tags ? JSON.parse(memory.tags) : [];

					// Filter by tags if specified
					if (filters?.tags && filters.tags.length > 0) {
						const hasMatchingTag = filters.tags.some((tag) => parsedTags.includes(tag));
						if (!hasMatchingTag) continue;
					}

					results.push({
						...memory,
						_id: `${conn.meta.alias}:${memory.id}`,
						_projectId: memory.project_id ? `${conn.meta.alias}:${memory.project_id}` : null,
						_parsedTags: parsedTags,
						_sourceDb: conn.meta.path,
						_sourceAlias: conn.meta.alias
					});
				}
			} catch (error) {
				console.error(`[ConductorAPI] Error querying memories from ${conn.meta.alias}:`, error);
			}
		}

		const sources = databases.map((d) => d.meta.alias);
		queryCache.set(cacheKey, results, { invalidatedBy: sources });

		return results;
	}

	/**
	 * Search memories by content
	 */
	searchMemories(query: string, limit: number = 50): AggregatedMemory[] {
		const cacheKey = queryCache.makeKey('memories:search', { query, limit });
		const cached = queryCache.get<AggregatedMemory[]>(cacheKey);
		if (cached) return cached;

		const results: AggregatedMemory[] = [];
		const databases = getActiveDatabases();

		for (const conn of databases) {
			try {
				const memories = conn.db
					.prepare(
						`SELECT * FROM memories 
             WHERE name LIKE ? OR content LIKE ?
             ORDER BY created_at DESC
             LIMIT ?`
					)
					.all(`%${query}%`, `%${query}%`, limit) as Memory[];

				for (const memory of memories) {
					results.push({
						...memory,
						_id: `${conn.meta.alias}:${memory.id}`,
						_projectId: memory.project_id ? `${conn.meta.alias}:${memory.project_id}` : null,
						_parsedTags: memory.tags ? JSON.parse(memory.tags) : [],
						_sourceDb: conn.meta.path,
						_sourceAlias: conn.meta.alias
					});
				}
			} catch (error) {
				console.error(`[ConductorAPI] Error searching memories in ${conn.meta.alias}:`, error);
			}
		}

		// Sort by relevance (name matches first, then by date)
		results.sort((a, b) => {
			const aNameMatch = a.name.toLowerCase().includes(query.toLowerCase());
			const bNameMatch = b.name.toLowerCase().includes(query.toLowerCase());
			if (aNameMatch && !bNameMatch) return -1;
			if (!aNameMatch && bNameMatch) return 1;
			return b.created_at - a.created_at;
		});

		const sources = databases.map((d) => d.meta.alias);
		queryCache.set(cacheKey, results.slice(0, limit), { invalidatedBy: sources });

		return results.slice(0, limit);
	}

	// ===================
	// QUALITY ISSUES
	// ===================

	/**
	 * Get quality reflections across all databases
	 */
	getQualityIssues(filters?: QualityFilters): AggregatedQualityReflection[] {
		const cacheKey = queryCache.makeKey('quality', filters);
		const cached = queryCache.get<AggregatedQualityReflection[]>(cacheKey);
		if (cached) return cached;

		const results: AggregatedQualityReflection[] = [];

		let databases = getActiveDatabases();
		let projectIdFilter: string | undefined;

		if (filters?.sourceAlias) {
			const conn = getDatabase(filters.sourceAlias);
			databases = conn ? [conn] : [];
		}

		if (filters?.projectId) {
			const [alias, id] = this.parseCompositeId(filters.projectId);
			const conn = getDatabase(alias);
			databases = conn ? [conn] : [];
			projectIdFilter = id;
		}

		for (const conn of databases) {
			let sql = 'SELECT * FROM quality_reflections WHERE 1=1';
			const params: unknown[] = [];

			if (projectIdFilter) {
				sql += ' AND project_id = ?';
				params.push(projectIdFilter);
			}
			if (!filters?.includeResolved) {
				sql += ' AND resolved = 0';
			}
			if (filters?.reflectionType) {
				sql += ' AND reflection_type = ?';
				params.push(filters.reflectionType);
			}

			sql += ' ORDER BY created_at DESC';

			if (filters?.limit) {
				sql += ' LIMIT ?';
				params.push(filters.limit);
			}

			try {
				const reflections = conn.db.prepare(sql).all(...params) as QualityReflection[];

				for (const reflection of reflections) {
					results.push({
						...reflection,
						_id: `${conn.meta.alias}:${reflection.id}`,
						_projectId: `${conn.meta.alias}:${reflection.project_id}`,
						_featureId: reflection.feature_id
							? `${conn.meta.alias}:${reflection.feature_id}`
							: null,
						_sessionId: reflection.session_id
							? `${conn.meta.alias}:${reflection.session_id}`
							: null,
						_sourceDb: conn.meta.path,
						_sourceAlias: conn.meta.alias
					});
				}
			} catch (error) {
				console.error(`[ConductorAPI] Error querying quality from ${conn.meta.alias}:`, error);
			}
		}

		const sources = databases.map((d) => d.meta.alias);
		queryCache.set(cacheKey, results, { invalidatedBy: sources });

		return results;
	}

	// ===================
	// STATS
	// ===================

	/**
	 * Get aggregated dashboard statistics
	 */
	getStats(): DashboardStats {
		const cacheKey = 'stats';
		const cached = queryCache.get<DashboardStats>(cacheKey);
		if (cached) return cached;

		const stats: DashboardStats = {
			totalProjects: 0,
			totalFeatures: 0,
			featuresByStatus: {},
			totalSessions: 0,
			activeSessions: 0,
			totalMemories: 0,
			unresolvedIssues: 0,
			databaseCount: 0
		};

		const databases = getActiveDatabases();
		stats.databaseCount = databases.length;

		for (const conn of databases) {
			try {
				// Projects count
				const projectCount = conn.db.prepare('SELECT COUNT(*) as count FROM projects').get() as {
					count: number;
				};
				stats.totalProjects += projectCount.count;

				// Features count and by status
				const features = conn.db
					.prepare('SELECT status, COUNT(*) as count FROM features GROUP BY status')
					.all() as { status: string; count: number }[];

				for (const row of features) {
					stats.totalFeatures += row.count;
					stats.featuresByStatus[row.status] =
						(stats.featuresByStatus[row.status] || 0) + row.count;
				}

				// Sessions
				const sessionCount = conn.db.prepare('SELECT COUNT(*) as count FROM sessions').get() as {
					count: number;
				};
				stats.totalSessions += sessionCount.count;

				const activeCount = conn.db
					.prepare("SELECT COUNT(*) as count FROM sessions WHERE status = 'active'")
					.get() as { count: number };
				stats.activeSessions += activeCount.count;

				// Memories
				const memoryCount = conn.db.prepare('SELECT COUNT(*) as count FROM memories').get() as {
					count: number;
				};
				stats.totalMemories += memoryCount.count;

				// Unresolved quality issues
				const issueCount = conn.db
					.prepare('SELECT COUNT(*) as count FROM quality_reflections WHERE resolved = 0')
					.get() as { count: number };
				stats.unresolvedIssues += issueCount.count;
			} catch (error) {
				console.error(`[ConductorAPI] Error getting stats from ${conn.meta.alias}:`, error);
			}
		}

		queryCache.set(cacheKey, stats, { ttl: 60_000 }); // Cache stats for 1 minute

		return stats;
	}

	// ===================
	// SYNC CONTROL
	// ===================

	/**
	 * Set live mode (5 second polling)
	 */
	setLiveMode(enabled: boolean): void {
		syncEngine.setLiveMode(enabled);
	}

	/**
	 * Get current sync state
	 */
	getSyncState(): SyncState {
		return syncEngine.getState();
	}

	/**
	 * Force an immediate refresh
	 */
	async forceRefresh(): Promise<void> {
		queryCache.clear();
		await syncEngine.forceSync();
		this.notifyListeners();
	}

	/**
	 * Subscribe to data changes
	 */
	onDataChange(callback: DataChangeListener): () => void {
		this.changeListeners.add(callback);
		return () => this.changeListeners.delete(callback);
	}

	/**
	 * Notify all data change listeners
	 */
	private notifyListeners(): void {
		for (const listener of this.changeListeners) {
			try {
				listener();
			} catch (error) {
				console.error('[ConductorAPI] Error in data change listener:', error);
			}
		}
	}

	// ===================
	// DATABASE MANAGEMENT
	// ===================

	/**
	 * Get metadata for all connected databases
	 */
	getDatabases(): ReturnType<typeof getDatabasesMeta> {
		return getDatabasesMeta();
	}

	/**
	 * Rescan for databases with new config
	 */
	rescan(config: Config): number {
		// Shutdown current connections
		this.shutdown();

		// Re-initialize
		this.initialize(config);

		return getActiveDatabases().length;
	}

	/**
	 * Discover databases without opening them (for setup wizard)
	 */
	discoverDatabases(
		scanPaths: string[],
		excludePatterns?: string[],
		maxDepth?: number
	): ReturnType<typeof discoverDatabasesDetailed> {
		return discoverDatabasesDetailed(scanPaths, excludePatterns, maxDepth);
	}

	// ===================
	// HELPERS
	// ===================

	/**
	 * Parse a composite ID into [alias, id]
	 */
	private parseCompositeId(compositeId: string): [string, string] {
		const colonIndex = compositeId.indexOf(':');
		if (colonIndex === -1) {
			throw new Error(`Invalid composite ID: ${compositeId}`);
		}
		return [compositeId.slice(0, colonIndex), compositeId.slice(colonIndex + 1)];
	}
}

// Export singleton instance
export const conductorAPI = new ConductorAPI();
