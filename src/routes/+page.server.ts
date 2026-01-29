import { conductorAPI } from '$lib/server/db/api';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const stats = conductorAPI.getStats();
	const databases = conductorAPI.getDatabases();
	const recentSessions = conductorAPI.getSessions({ limit: 5 });
	const recentMemories = conductorAPI.getMemories({ limit: 5 });

	return {
		stats,
		databases,
		recentSessions,
		recentMemories
	};
};
