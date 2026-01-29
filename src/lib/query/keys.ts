/**
 * Query key factories for TanStack Query.
 * Use these for consistent cache keys and easy invalidation.
 */

export const queryKeys = {
	all: ['conductor'] as const,
	stats: () => [...queryKeys.all, 'stats'] as const,
	databases: () => [...queryKeys.all, 'databases'] as const,
	syncState: () => [...queryKeys.all, 'syncState'] as const,
	projects: (filters?: Record<string, unknown>) =>
		[...queryKeys.all, 'projects', filters ?? {}] as const,
	project: (id: string) => [...queryKeys.all, 'projects', id] as const,
	features: (filters?: Record<string, unknown>) =>
		[...queryKeys.all, 'features', filters ?? {}] as const,
	feature: (id: string) => [...queryKeys.all, 'features', id] as const,
	sessions: (filters?: Record<string, unknown>) =>
		[...queryKeys.all, 'sessions', filters ?? {}] as const,
	memories: (filters?: Record<string, unknown>) =>
		[...queryKeys.all, 'memories', filters ?? {}] as const,
	memoriesSearch: (query: string, limit?: number) =>
		[...queryKeys.all, 'memories', 'search', query, limit] as const,
	quality: (filters?: Record<string, unknown>) =>
		[...queryKeys.all, 'quality', filters ?? {}] as const,
	config: () => [...queryKeys.all, 'config'] as const
};
