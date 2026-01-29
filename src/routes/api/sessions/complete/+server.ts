import { json } from '@sveltejs/kit';
import { conductorAPI } from '$lib/server/db/api';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	if (!conductorAPI.isInitialized()) {
		return json({ error: 'Not initialized' }, { status: 503 });
	}

	let body: { sessionId?: string; notes?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const sessionId = body.sessionId?.trim();
	if (!sessionId || sessionId.indexOf(':') === -1) {
		return json({ error: 'sessionId (composite alias:id) required' }, { status: 400 });
	}

	try {
		conductorAPI.completeSession(sessionId, body.notes ?? null);
		return json({ success: true });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to complete session';
		return json({ error: message }, { status: 400 });
	}
};
