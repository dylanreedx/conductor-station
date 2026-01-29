import { conductorAPI } from '$lib/server/db/api';
import type { SessionFilters } from '$lib/server/db/types';
import type { PageServerLoad } from './$types';

const DEFAULT_LIMIT = 100;

export const load: PageServerLoad = async ({ url }) => {
	const projectId = url.searchParams.get('projectId') ?? undefined;
	const sourceAlias = url.searchParams.get('sourceAlias') ?? undefined;
	const status = url.searchParams.get('status') as SessionFilters['status'] | null;
	const limit = Math.min(
		parseInt(url.searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT,
		500
	);

	const filters: SessionFilters = {
		projectId: projectId || undefined,
		sourceAlias: sourceAlias || undefined,
		status: status ?? undefined,
		limit
	};

	const [sessions, projects] = await Promise.all([
		Promise.resolve(conductorAPI.getSessions(filters)),
		Promise.resolve(conductorAPI.getProjects())
	]);

	return {
		sessions,
		projects,
		filters: {
			projectId: filters.projectId ?? '',
			sourceAlias: filters.sourceAlias ?? '',
			status: filters.status ?? ''
		}
	};
};
