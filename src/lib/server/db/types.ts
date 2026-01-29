// ===================
// BASE TYPES (match Conductor schema exactly)
// ===================

export interface Project {
	id: string;
	name: string;
	project_type: string;
	workspace_path: string | null;
	depends_on: string | null; // JSON array string
	ready_threshold: number;
	created_at: number;
}

export interface Session {
	id: string;
	project_id: string;
	session_number: number;
	status: 'pending' | 'active' | 'completed';
	is_initializer: number; // 0 or 1
	started_at: number | null;
	completed_at: number | null;
	progress_notes: string | null;
}

export interface Feature {
	id: string;
	project_id: string;
	category: string;
	phase: number;
	description: string;
	steps: string | null; // JSON array
	depends_on: string | null; // JSON array
	status: 'pending' | 'in_progress' | 'passed' | 'failed' | 'blocked';
	priority: number;
	attempt_count: number;
	last_error: string | null;
	updated_at: number | null;
	session_id: string | null;
	commit_hash: string | null;
}

export interface Memory {
	id: string;
	project_id: string | null;
	name: string;
	content: string;
	tags: string | null; // JSON array
	created_at: number;
	last_accessed_at: number | null;
}

export interface Handoff {
	id: string;
	project_id: string;
	session_id: string;
	current_task: string | null;
	next_steps: string | null; // JSON array
	blockers: string | null; // JSON array
	files_modified: string | null; // JSON array
	git_commit: string | null;
	created_at: number;
}

export interface Commit {
	id: string;
	feature_id: string;
	session_id: string;
	commit_hash: string;
	message: string | null;
	files_changed: string | null; // JSON array
	created_at: number;
}

export interface FeatureError {
	id: string;
	feature_id: string;
	session_id: string;
	error: string;
	error_type: 'test_failure' | 'build_error' | 'runtime_error' | 'blocked' | 'other';
	stack_trace: string | null;
	attempt_number: number;
	created_at: number;
}

export interface QualityReflection {
	id: string;
	project_id: string;
	feature_id: string | null;
	session_id: string | null;
	handoff_id: string | null;
	reflection_type: 'feature_complete' | 'session_complete' | 'handoff';
	shortcuts_taken: string | null; // JSON array
	tests_skipped: string | null; // JSON array
	tests_removed: string | null; // JSON array
	known_limitations: string | null; // JSON array
	deferred_work: string | null; // JSON array
	technical_debt: string | null; // JSON array
	resolved: number; // 0 or 1
	resolved_at: number | null;
	resolved_notes: string | null;
	created_at: number;
}

// ===================
// SOURCE METADATA
// ===================

export interface SourceMeta {
	_id: string; // Composite: "alias:uuid"
	_sourceDb: string; // Full path to DB
	_sourceAlias: string; // Short alias (e.g., "selectus")
}

// ===================
// AGGREGATED TYPES (with source metadata)
// ===================

export interface AggregatedProject extends Project, SourceMeta {
	_displayName: string; // "name (alias)"
}

export interface AggregatedSession extends Session, SourceMeta {
	_projectId: string; // Composite project ID
}

export interface AggregatedFeature extends Feature, SourceMeta {
	_projectId: string; // Composite project ID
}

export interface AggregatedMemory extends Memory, SourceMeta {
	_projectId: string | null; // Composite project ID or null
	_parsedTags: string[]; // Parsed from JSON
}

export interface AggregatedHandoff extends Handoff, SourceMeta {
	_projectId: string;
	_sessionId: string;
}

export interface AggregatedCommit extends Commit, SourceMeta {
	_featureId: string;
	_sessionId: string;
}

export interface AggregatedFeatureError extends FeatureError, SourceMeta {
	_featureId: string;
	_sessionId: string;
}

export interface AggregatedQualityReflection extends QualityReflection, SourceMeta {
	_projectId: string;
	_featureId: string | null;
	_sessionId: string | null;
}

// ===================
// DATABASE CONNECTION
// ===================

export interface DatabaseConnection {
	path: string;
	alias: string;
	mtime: number;
	projectCount: number;
	isValid: boolean;
}

// ===================
// SYNC STATE
// ===================

export interface DatabaseMeta {
	path: string;
	alias: string;
	mtime: number;
	lastChecked: number;
	projectCount: number;
	isValid: boolean;
}

export interface SyncState {
	databases: DatabaseMeta[];
	lastSync: number;
	isLiveMode: boolean;
	pollInterval: number;
}

// ===================
// CACHE
// ===================

export interface CacheEntry<T> {
	data: T;
	timestamp: number;
	ttl: number;
	invalidatedBy: string[]; // DB aliases that can invalidate this
}

export interface CacheStats {
	size: number;
	hits: number;
	misses: number;
	hitRate: number;
}

// ===================
// DASHBOARD STATS
// ===================

export interface DashboardStats {
	totalProjects: number;
	totalFeatures: number;
	featuresByStatus: Record<string, number>;
	totalSessions: number;
	activeSessions: number;
	totalMemories: number;
	unresolvedIssues: number;
	databaseCount: number;
}

// ===================
// FILTER TYPES
// ===================

export interface ProjectFilters {
	sourceAlias?: string;
	projectType?: string;
	search?: string;
}

export interface FeatureFilters {
	sourceAlias?: string;
	projectId?: string; // Composite ID
	status?: 'pending' | 'in_progress' | 'passed' | 'failed' | 'blocked';
	phase?: number;
	category?: string;
	search?: string;
	limit?: number;
	offset?: number;
}

export interface SessionFilters {
	sourceAlias?: string;
	projectId?: string;
	status?: 'pending' | 'active' | 'completed';
	limit?: number;
}

export interface MemoryFilters {
	sourceAlias?: string;
	projectId?: string;
	tags?: string[];
	limit?: number;
}

export interface QualityFilters {
	sourceAlias?: string;
	projectId?: string;
	includeResolved?: boolean;
	reflectionType?: 'feature_complete' | 'session_complete' | 'handoff';
	limit?: number;
}

export interface HandoffFilters {
	sourceAlias?: string;
	projectId?: string;
	sessionId?: string; // Composite ID
	limit?: number;
}

export interface CommitFilters {
	sourceAlias?: string;
	projectId?: string; // Composite - filter by project via session
	sessionId?: string; // Composite ID
	featureId?: string; // Composite ID
	limit?: number;
}

export interface FeatureErrorFilters {
	sourceAlias?: string;
	projectId?: string;
	sessionId?: string; // Composite ID
	featureId?: string; // Composite ID
	errorType?: FeatureError['error_type'];
	limit?: number;
}

// ===================
// CONFIG
// ===================

export interface SyncConfig {
	defaultInterval: number; // 120000 (2 min)
	liveInterval: number; // 5000 (5s)
	cacheTTL: number; // 30000 (30s)
}

export interface Config {
	scanPaths: string[];
	scanDepth: number;
	excludePatterns: string[];
	sync: SyncConfig;
	theme: 'light' | 'dark' | 'system';
}
