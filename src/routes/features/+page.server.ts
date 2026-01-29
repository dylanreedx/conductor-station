import { conductorAPI } from '$lib/server/db/api';
import type { FeatureFilters } from '$lib/server/db/types';
import type { PageServerLoad } from './$types';

const DEFAULT_LIMIT = 100;

export const load: PageServerLoad = async ({ url }) => {
	const projectId = url.searchParams.get('projectId') ?? undefined;
	const sourceAlias = url.searchParams.get('sourceAlias') ?? undefined;
	const status = url.searchParams.get('status') as FeatureFilters['status'] | null;
	const phaseParam = url.searchParams.get('phase');
	const phase = phaseParam !== null && phaseParam !== '' ? parseInt(phaseParam, 10) : undefined;
	const category = url.searchParams.get('category') ?? undefined;
	const search = url.searchParams.get('search') ?? undefined;
	const limit = Math.min(
		parseInt(url.searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT,
		500
	);
	const offset = parseInt(url.searchParams.get('offset') ?? '0', 10) || 0;

	const filters: FeatureFilters = {
		projectId: projectId || undefined,
		sourceAlias: sourceAlias || undefined,
		status: status ?? undefined,
		phase: Number.isNaN(phase) ? undefined : phase,
		category: category || undefined,
		search: search || undefined,
		limit,
		offset
	};

	const [features, projects] = await Promise.all([
		Promise.resolve(conductorAPI.getFeatures(filters)),
		Promise.resolve(conductorAPI.getProjects())
	]);

	return {
		features,
		projects,
		filters: {
			projectId: filters.projectId ?? '',
			sourceAlias: filters.sourceAlias ?? '',
			status: filters.status ?? '',
			phase: filters.phase?.toString() ?? '',
			category: filters.category ?? '',
			search: filters.search ?? '',
			limit: filters.limit,
			offset: filters.offset
		}
	};
};
