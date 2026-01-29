import { json } from '@sveltejs/kit';
import { conductorAPI } from '$lib/server/db/api';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { enabled } = await request.json();
	conductorAPI.setLiveMode(enabled);
	return json({ success: true, isLiveMode: enabled });
};

export const GET: RequestHandler = async () => {
	const state = conductorAPI.getSyncState();
	return json({ isLiveMode: state.isLiveMode });
};
