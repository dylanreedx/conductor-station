import { integer, sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const projects = sqliteTable('projects', {
	id: text('id').primaryKey(),
	name: text('name').notNull().unique(),
	projectType: text('project_type').notNull(),
	workspacePath: text('workspace_path'),
	dependsOn: text('depends_on'),
	readyThreshold: integer('ready_threshold').notNull().default(30),
	createdAt: integer('created_at').default(sql`(unixepoch())`)
});

export const sessions = sqliteTable(
	'sessions',
	{
		id: text('id').primaryKey(),
		projectId: text('project_id').references(() => projects.id),
		sessionNumber: integer('session_number').notNull(),
		status: text('status').notNull().default('pending'),
		isInitializer: integer('is_initializer').default(0),
		startedAt: integer('started_at'),
		completedAt: integer('completed_at'),
		progressNotes: text('progress_notes')
	},
	(table) => ({
		projectIdx: index('idx_sessions_project').on(table.projectId)
	})
);

export const features = sqliteTable(
	'features',
	{
		id: text('id').primaryKey(),
		projectId: text('project_id').references(() => projects.id),
		category: text('category').notNull(),
		phase: integer('phase').notNull(),
		description: text('description').notNull(),
		steps: text('steps'),
		dependsOn: text('depends_on'),
		status: text('status').notNull().default('pending'),
		priority: integer('priority').notNull().default(0),
		attemptCount: integer('attempt_count').notNull().default(0),
		lastError: text('last_error'),
		updatedAt: integer('updated_at').default(sql`(unixepoch())`),
		sessionId: text('session_id').references(() => sessions.id),
		commitHash: text('commit_hash')
	},
	(table) => ({
		projectIdx: index('idx_features_project').on(table.projectId),
		statusIdx: index('idx_features_status').on(table.status),
		priorityIdx: index('idx_features_priority').on(table.priority)
	})
);

export const archivedFeatures = sqliteTable(
	'archived_features',
	{
		id: text('id').primaryKey(),
		projectId: text('project_id').references(() => projects.id),
		category: text('category').notNull(),
		phase: integer('phase').notNull(),
		description: text('description').notNull(),
		steps: text('steps'),
		dependsOn: text('depends_on'),
		status: text('status').notNull(),
		priority: integer('priority').notNull().default(0),
		attemptCount: integer('attempt_count').notNull().default(0),
		lastError: text('last_error'),
		createdAt: integer('created_at'),
		updatedAt: integer('updated_at'),
		archivedAt: integer('archived_at').default(sql`(unixepoch())`),
		sessionId: text('session_id'),
		commitHash: text('commit_hash'),
		archiveReason: text('archive_reason')
	},
	(table) => ({
		projectIdx: index('idx_archived_project').on(table.projectId)
	})
);

export const memories = sqliteTable(
	'memories',
	{
		id: text('id').primaryKey(),
		projectId: text('project_id').references(() => projects.id),
		name: text('name').notNull(),
		content: text('content').notNull(),
		tags: text('tags'),
		createdAt: integer('created_at').default(sql`(unixepoch())`),
		lastAccessedAt: integer('last_accessed_at')
	},
	(table) => ({
		projectIdx: index('idx_memories_project').on(table.projectId)
	})
);

export const handoffs = sqliteTable(
	'handoffs',
	{
		id: text('id').primaryKey(),
		projectId: text('project_id').references(() => projects.id),
		sessionId: text('session_id').references(() => sessions.id),
		currentTask: text('current_task'),
		nextSteps: text('next_steps'),
		blockers: text('blockers'),
		filesModified: text('files_modified'),
		gitCommit: text('git_commit'),
		createdAt: integer('created_at').default(sql`(unixepoch())`)
	},
	(table) => ({
		projectIdx: index('idx_handoffs_project').on(table.projectId)
	})
);

export const commits = sqliteTable('commits', {
	id: text('id').primaryKey(),
	featureId: text('feature_id').references(() => features.id),
	sessionId: text('session_id').references(() => sessions.id),
	commitHash: text('commit_hash').notNull(),
	message: text('message'),
	filesChanged: text('files_changed'),
	createdAt: integer('created_at').default(sql`(unixepoch())`)
});

export const featureErrors = sqliteTable('feature_errors', {
	id: text('id').primaryKey(),
	featureId: text('feature_id').references(() => features.id),
	sessionId: text('session_id').references(() => sessions.id),
	error: text('error').notNull(),
	errorType: text('error_type').notNull(),
	stackTrace: text('stack_trace'),
	attemptNumber: integer('attempt_number').notNull().default(1),
	createdAt: integer('created_at').default(sql`(unixepoch())`)
});

export const qualityReflections = sqliteTable(
	'quality_reflections',
	{
		id: text('id').primaryKey(),
		projectId: text('project_id').references(() => projects.id),
		featureId: text('feature_id').references(() => features.id),
		sessionId: text('session_id').references(() => sessions.id),
		handoffId: text('handoff_id').references(() => handoffs.id),
		reflectionType: text('reflection_type').notNull(),
		shortcutsTaken: text('shortcuts_taken'),
		testsSkipped: text('tests_skipped'),
		testsRemoved: text('tests_removed'),
		knownLimitations: text('known_limitations'),
		deferredWork: text('deferred_work'),
		technicalDebt: text('technical_debt'),
		resolved: integer('resolved').default(0),
		resolvedAt: integer('resolved_at'),
		resolvedNotes: text('resolved_notes'),
		createdAt: integer('created_at').default(sql`(unixepoch())`)
	},
	(table) => ({
		projectIdx: index('idx_quality_reflections_project').on(table.projectId),
		featureIdx: index('idx_quality_reflections_feature').on(table.featureId),
		unresolvedIdx: index('idx_quality_reflections_unresolved').on(table.resolved)
	})
);
