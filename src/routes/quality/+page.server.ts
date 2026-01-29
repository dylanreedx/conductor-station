import { conductorAPI } from '$lib/server/db/api';
import type { QualityFilters } from '$lib/server/db/types';
import type { PageServerLoad } from './$types';

const DEFAULT_LIMIT = 100;

export const load: PageServerLoad = async ({ url }) => {
	const projectId = url.searchParams.get('projectId') ?? undefined;
	const sourceAlias = url.searchParams.get('sourceAlias') ?? undefined;
	const includeResolved = url.searchParams.get('includeResolved') === '1';
	const reflectionType = url.searchParams.get('reflectionType') as
		| QualityFilters['reflectionType']
		| null;
	const limit = Math.min(
		parseInt(url.searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT,
		500
	);

	const filters: QualityFilters = {
		projectId: projectId || undefined,
		sourceAlias: sourceAlias || undefined,
		includeResolved,
		reflectionType: reflectionType ?? undefined,
		limit
	};

	const [issues, projects] = await Promise.all([
		Promise.resolve(conductorAPI.getQualityIssues(filters)),
		Promise.resolve(conductorAPI.getProjects())
	]);

	return {
		issues,
		projects,
		filters: {
			projectId: filters.projectId ?? '',
			sourceAlias: filters.sourceAlias ?? '',
			includeResolved: filters.includeResolved ?? false,
			reflectionType: filters.reflectionType ?? '',
			limit: filters.limit
		}
	};
};
