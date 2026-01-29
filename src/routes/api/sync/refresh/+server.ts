import { json } from '@sveltejs/kit';
import { conductorAPI } from '$lib/server/db/api';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
	await conductorAPI.forceRefresh();
	return json({ success: true });
};
