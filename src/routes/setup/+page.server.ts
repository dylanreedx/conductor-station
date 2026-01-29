import { fail, redirect } from '@sveltejs/kit';
import { createConfig } from '$lib/server/config';
import { discoverDatabasesDetailed } from '$lib/server/db/discovery';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Just return empty data, the form will handle the flow
	return {};
};

export const actions: Actions = {
	/**
	 * Scan directories for Conductor databases
	 */
	scan: async ({ request }) => {
		const formData = await request.formData();
		const pathsRaw = formData.get('paths');

		if (!pathsRaw || typeof pathsRaw !== 'string') {
			return fail(400, { error: 'No paths provided' });
		}

		// Parse paths (comma or newline separated)
		const paths = pathsRaw
			.split(/[,\n]/)
			.map((p) => p.trim())
			.filter((p) => p.length > 0);

		if (paths.length === 0) {
			return fail(400, { error: 'No valid paths provided' });
		}

		// Discover databases
		const databases = discoverDatabasesDetailed(paths);

		return {
			success: true,
			paths,
			databases
		};
	},

	/**
	 * Create config and complete setup
	 */
	complete: async ({ request }) => {
		const formData = await request.formData();
		const pathsRaw = formData.get('paths');

		if (!pathsRaw || typeof pathsRaw !== 'string') {
			return fail(400, { error: 'No paths provided' });
		}

		// Parse paths
		const paths = pathsRaw
			.split(/[,\n]/)
			.map((p) => p.trim())
			.filter((p) => p.length > 0);

		if (paths.length === 0) {
			return fail(400, { error: 'No valid paths provided' });
		}

		// Create config
		createConfig(paths);

		// Redirect to dashboard
		throw redirect(303, '/');
	}
};
