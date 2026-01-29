import { json } from '@sveltejs/kit';
import { conductorAPI } from '$lib/server/db/api';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const state = conductorAPI.getSyncState();
	return json(state);
};
