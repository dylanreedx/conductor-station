import { fail, redirect } from '@sveltejs/kit';
import { loadConfig, updateScanPaths } from '$lib/server/config';
import { conductorAPI } from '$lib/server/db/api';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const config = loadConfig();
	return {
		scanPaths: config.scanPaths,
		scanDepth: config.scanDepth,
		excludePatterns: config.excludePatterns
	};
};

export const actions: Actions = {
	/**
	 * Rescan current paths (no path changes). Use when you've added new projects under existing parent dirs.
	 */
	rescan: async () => {
		const config = loadConfig();
		conductorAPI.rescan(config);
		throw redirect(303, '/settings');
	},

	/**
	 * Update scan paths and rescan
	 */
	save: async ({ request }) => {
		const formData = await request.formData();
		const pathsRaw = formData.get('paths');

		if (pathsRaw === null || pathsRaw === undefined) {
			return fail(400, { error: 'No paths data' });
		}

		let scanPaths: string[];
		if (typeof pathsRaw === 'string') {
			try {
				scanPaths = JSON.parse(pathsRaw) as string[];
			} catch {
				scanPaths = pathsRaw
					.split(/[,\n]/)
					.map((p) => p.trim())
					.filter((p) => p.length > 0);
			}
		} else {
			scanPaths = [];
		}

		if (!Array.isArray(scanPaths)) {
			return fail(400, { error: 'Invalid paths format' });
		}

		scanPaths = scanPaths
			.map((p) => (typeof p === 'string' ? p.trim() : String(p)))
			.filter(Boolean);

		const config = updateScanPaths(scanPaths);
		conductorAPI.rescan(config);

		throw redirect(303, '/settings');
	}
};
