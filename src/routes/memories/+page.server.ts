import { conductorAPI } from '$lib/server/db/api';
import type { MemoryFilters } from '$lib/server/db/types';
import type { PageServerLoad } from './$types';

const DEFAULT_LIMIT = 50;

export const load: PageServerLoad = async ({ url }) => {
	const q = url.searchParams.get('q') ?? url.searchParams.get('query') ?? '';
	const projectId = url.searchParams.get('projectId') ?? undefined;
	const sourceAlias = url.searchParams.get('sourceAlias') ?? undefined;
	const limit = Math.min(
		parseInt(url.searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT,
		200
	);

	const projects = conductorAPI.getProjects();

	let memories: Awaited<ReturnType<typeof conductorAPI.getMemories>>;
	if (q.trim()) {
		memories = conductorAPI.searchMemories(q.trim(), limit);
	} else {
		const filters: MemoryFilters = {
			projectId: projectId || undefined,
			sourceAlias: sourceAlias || undefined,
			limit
		};
		memories = conductorAPI.getMemories(filters);
	}

	return {
		memories,
		projects,
		filters: {
			q,
			projectId: projectId ?? '',
			sourceAlias: sourceAlias ?? '',
			limit
		}
	};
};
