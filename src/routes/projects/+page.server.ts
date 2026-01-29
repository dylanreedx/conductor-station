import { conductorAPI } from '$lib/server/db/api';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const projects = conductorAPI.getProjects();
	const features = conductorAPI.getFeatures({ limit: 5000 });

	const progressByProject: Record<string, { passed: number; total: number }> = {};
	for (const f of features) {
		const pid = f._projectId;
		if (!pid) continue;
		if (!progressByProject[pid]) progressByProject[pid] = { passed: 0, total: 0 };
		progressByProject[pid].total += 1;
		if (f.status === 'passed') progressByProject[pid].passed += 1;
	}

	return {
		projects,
		progressByProject
	};
};
