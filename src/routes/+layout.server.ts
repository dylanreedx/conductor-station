import { redirect } from '@sveltejs/kit';
import { configExists, loadConfig } from '$lib/server/config';
import { conductorAPI } from '$lib/server/db/api';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ url }) => {
	const isSetupRoute = url.pathname.startsWith('/setup');
	const hasConfig = configExists();

	// First-run: no config and not on setup page -> redirect to setup
	if (!hasConfig && !isSetupRoute) {
		throw redirect(307, '/setup');
	}

	// Has config and on setup page -> redirect to dashboard
	if (hasConfig && isSetupRoute) {
		throw redirect(307, '/');
	}

	// If we have a config, initialize the API
	if (hasConfig && !conductorAPI.isInitialized()) {
		const config = loadConfig();
		conductorAPI.initialize(config);
	}

	// Return sync state for the layout
	if (hasConfig) {
		return {
			hasConfig: true,
			syncState: conductorAPI.getSyncState(),
			theme: loadConfig().theme
		};
	}

	return {
		hasConfig: false,
		syncState: null,
		theme: 'system' as const
	};
};
