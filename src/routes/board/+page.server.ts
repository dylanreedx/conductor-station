import { conductorAPI } from '$lib/server/db/api';
import { getEffectiveSessionStatus } from '$lib/server/db/effectiveStatus';
import type { SessionFilters } from '$lib/server/db/types';
import type { TimelineData, TimelineEvent } from '$lib/board/types';
import type { PageServerLoad } from './$types';

const SESSION_LIMIT = 200;
const EVENTS_LIMIT = 500;

export const load: PageServerLoad = async ({ url }) => {
	const projectId = url.searchParams.get('projectId') ?? undefined;
	const viewParam = url.searchParams.get('view') ?? 'list';
	const view = viewParam === 'board' ? 'board' : 'list';

	const sessionFilters: SessionFilters = {
		projectId: projectId || undefined,
		limit: SESSION_LIMIT
	};

	const [sessions, projects, handoffs, commits, features, errors, memories, quality] =
		await Promise.all([
			Promise.resolve(conductorAPI.getSessions(sessionFilters)),
			Promise.resolve(conductorAPI.getProjects()),
			Promise.resolve(conductorAPI.getHandoffs({ projectId, limit: EVENTS_LIMIT })),
			Promise.resolve(conductorAPI.getCommits({ projectId, limit: EVENTS_LIMIT })),
			Promise.resolve(conductorAPI.getFeatures({ projectId, limit: EVENTS_LIMIT })),
			Promise.resolve(conductorAPI.getFeatureErrors({ projectId, limit: EVENTS_LIMIT })),
			Promise.resolve(conductorAPI.getMemories({ projectId, limit: EVENTS_LIMIT })),
			Promise.resolve(conductorAPI.getQualityIssues({ projectId, limit: EVENTS_LIMIT }))
		]);

	// Sort sessions newest first; nulls last
	const sortedSessions = [...sessions].sort((a, b) => {
		const ta = a.started_at ?? 0;
		const tb = b.started_at ?? 0;
		if (ta !== tb) return tb - ta;
		return (b.completed_at ?? 0) - (a.completed_at ?? 0);
	});

	// Display-only: effective status (stale sessions shown as completed)
	const sessionsWithDisplayStatus = sortedSessions.map((s) => ({
		...s,
		_displayStatus: getEffectiveSessionStatus(s) as 'pending' | 'active' | 'completed'
	}));

	const eventsBySession: Record<string, TimelineEvent[]> = {};
	let timeStart = Number.MAX_SAFE_INTEGER;
	let timeEnd = 0;

	function addEvent(sessionId: string, event: TimelineEvent) {
		if (!eventsBySession[sessionId]) eventsBySession[sessionId] = [];
		eventsBySession[sessionId].push(event);
		timeStart = Math.min(timeStart, event.timestamp);
		timeEnd = Math.max(timeEnd, event.timestamp);
	}

	for (const h of handoffs) {
		addEvent(h._sessionId, { type: 'handoff', timestamp: h.created_at, data: h });
	}
	for (const c of commits) {
		addEvent(c._sessionId, { type: 'commit', timestamp: c.created_at, data: c });
	}
	for (const f of features) {
		if (f.session_id) {
			const sid = `${f._sourceAlias}:${f.session_id}`;
			addEvent(sid, {
				type: 'feature',
				timestamp: f.updated_at ?? 0,
				data: f
			});
		}
	}
	for (const e of errors) {
		addEvent(e._sessionId, { type: 'error', timestamp: e.created_at, data: e });
	}
	for (const q of quality) {
		if (q._sessionId) {
			addEvent(q._sessionId, { type: 'quality', timestamp: q.created_at, data: q });
		}
	}

	// Assign memories to sessions by project + created_at within session time range
	for (const m of memories) {
		if (!m._projectId) continue;
		for (const s of sessionsWithDisplayStatus) {
			if (s._projectId !== m._projectId) continue;
			const start = s.started_at ?? 0;
			const end = s.completed_at ?? Math.floor(Date.now() / 1000);
			if (m.created_at >= start && m.created_at <= end) {
				addEvent(s._id, { type: 'memory', timestamp: m.created_at, data: m });
				break;
			}
		}
	}

	// Session time range
	for (const s of sessionsWithDisplayStatus) {
		if (s.started_at != null) {
			timeStart = Math.min(timeStart, s.started_at);
			timeEnd = Math.max(timeEnd, s.completed_at ?? Math.floor(Date.now() / 1000));
		}
	}
	if (timeStart === Number.MAX_SAFE_INTEGER) timeStart = 0;
	if (timeEnd === 0) timeEnd = Math.floor(Date.now() / 1000);

	// Sort events within each session by timestamp
	for (const sid of Object.keys(eventsBySession)) {
		eventsBySession[sid].sort((a, b) => a.timestamp - b.timestamp);
	}

	const activeSession =
		sessionsWithDisplayStatus.find((s) => s._displayStatus === 'active') ?? null;

	const timelineData: TimelineData = {
		sessions: sessionsWithDisplayStatus,
		eventsBySession,
		activeSession,
		timeRange: { start: timeStart, end: timeEnd }
	};

	return {
		timelineData,
		projects,
		filters: { projectId: projectId ?? '', view }
	};
};
