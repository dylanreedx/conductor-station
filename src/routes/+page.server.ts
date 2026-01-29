import { conductorAPI } from '$lib/server/db/api';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const stats = conductorAPI.getStats();
	const databases = conductorAPI.getDatabases();

	return {
		stats,
		databases
	};
};
