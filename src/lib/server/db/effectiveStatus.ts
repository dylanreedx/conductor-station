/**
 * Display-only completion rules for Conductor data.
 * Station is read-only; we never write. "Completed" here means we treat
 * stale sessions/projects as completed for dashboard display and counts.
 */

const SESSION_COMPLETE_AFTER_SECONDS = 2 * 24 * 3600;
const PROJECT_COMPLETE_AFTER_SECONDS = 7 * 24 * 3600;

export const SESSION_COMPLETE_AFTER_DAYS = 2;
export const PROJECT_COMPLETE_AFTER_DAYS = 7;

export type SessionLike = {
	status: string;
	started_at: number | null;
	completed_at: number | null;
};

/**
 * Last activity timestamp for a session (for staleness).
 * Uses completed_at if set, else started_at.
 */
function lastActivitySec(session: SessionLike): number | null {
	if (session.completed_at != null) return session.completed_at;
	return session.started_at;
}

/**
 * Effective session status for display: treat stale sessions as completed.
 * Session is "completed" if status !== 'completed' but last activity is > 2 days ago.
 */
export function getEffectiveSessionStatus(
	session: SessionLike,
	nowSec: number = Math.floor(Date.now() / 1000)
): 'pending' | 'active' | 'completed' {
	if (session.status === 'completed') return 'completed';
	const last = lastActivitySec(session);
	if (last == null) return session.status as 'pending' | 'active';
	if (nowSec - last >= SESSION_COMPLETE_AFTER_SECONDS) return 'completed';
	return session.status as 'pending' | 'active';
}

export type FeatureLike = { updated_at: number | null };
export type ProjectLike = { id: string };

/**
 * Latest activity timestamp for a project from its sessions and features.
 */
function projectLastActivitySec(
	sessions: SessionLike[],
	features: FeatureLike[],
	_projectId: string
): number {
	let latest = 0;
	for (const s of sessions) {
		const t = lastActivitySec(s) ?? s.started_at ?? 0;
		if (t > latest) latest = t;
	}
	for (const f of features) {
		const t = f.updated_at ?? 0;
		if (t > latest) latest = t;
	}
	return latest;
}

/**
 * True if the project's last activity (sessions + features) is older than 1 week.
 */
export function isProjectEffectivelyComplete(
	_project: ProjectLike,
	sessions: SessionLike[],
	features: FeatureLike[],
	nowSec: number = Math.floor(Date.now() / 1000)
): boolean {
	const last = projectLastActivitySec(sessions, features, _project.id);
	return last > 0 && nowSec - last >= PROJECT_COMPLETE_AFTER_SECONDS;
}
