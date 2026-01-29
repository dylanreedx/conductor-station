import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const params = new URLSearchParams();
	params.set('view', 'list');
	const projectId = url.searchParams.get('projectId');
	if (projectId) params.set('projectId', projectId);
	throw redirect(307, `/board?${params.toString()}`);
};
