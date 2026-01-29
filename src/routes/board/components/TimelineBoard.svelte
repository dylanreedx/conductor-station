<script lang="ts">
	import { format } from 'date-fns';
	import type { TimelineData } from '$lib/board/types';
	import type { AggregatedSession } from '$lib/server/db/types';
	import SessionBlock from './SessionBlock.svelte';
	import TimelineRail from './TimelineRail.svelte';
	import { cn } from '$lib/utils';

	const SECONDS_PER_DAY = 86400;

	interface Props {
		timelineData: TimelineData;
		class?: string;
	}

	let { timelineData, class: className = '' }: Props = $props();

	const PIXELS_PER_SECOND = 0.8;
	const MAX_RAIL_WIDTH_PX = 18000;
	const MAX_SESSION_WIDTH_PX = 600;
	const MIN_SESSION_WIDTH_PX = 140;
	const LANE_HEIGHT_PX = 140;
	const sessions = $derived(timelineData.sessions);
	const eventsBySession = $derived(timelineData.eventsBySession);
	const activeSession = $derived(timelineData.activeSession);
	const timeRange = $derived(timelineData.timeRange);

	const duration = $derived(Math.max(1, timeRange.end - timeRange.start));
	const rawRailWidthPx = $derived(duration * PIXELS_PER_SECOND);
	const effectivePps = $derived(
		rawRailWidthPx > MAX_RAIL_WIDTH_PX ? MAX_RAIL_WIDTH_PX / duration : PIXELS_PER_SECOND
	);
	const railWidthPx = $derived(duration * effectivePps);
	let scrollContainerEl: HTMLDivElement | null = $state(null);
	let focusedSessionId = $state<string | null>(null);
	let expandedIds = $state<Set<string>>(new Set());

	function toggleExpanded(sessionId: string) {
		const next = new Set(expandedIds);
		if (next.has(sessionId)) {
			next.delete(sessionId);
		} else {
			next.add(sessionId);
		}
		expandedIds = next;
	}

	/** Convert time (unix sec) to scroll position px. Inverted: left = newest. */
	function timeToPos(t: number): number {
		return ((timeRange.end - t) / duration) * railWidthPx;
	}

	const nowTs = $derived(Math.floor(Date.now() / 1000));

	/** Last activity for a session (used for effective end when completed_at is null) */
	function lastActivitySec(s: AggregatedSession): number | null {
		return s.completed_at ?? s.started_at;
	}

	/** Effective end time: use lastActivity for stale/leading sessions, not "now" */
	function effectiveEnd(session: AggregatedSession, start: number): number {
		if (session.completed_at != null) return session.completed_at;
		if (session._displayStatus === 'active') return nowTs;
		const last = lastActivitySec(session);
		if (last != null) return Math.max(last, start + 60);
		return Math.max(start + 60, timeRange.end);
	}

	/** Sessions sorted by started_at (chronological) with leftPx, widthPx, laneIndex. Axis: left = newest. */
	const positionedSessions = $derived(
		(function () {
			const sorted = [...sessions].sort((a, b) => {
				const ta = a.started_at ?? 0;
				const tb = b.started_at ?? 0;
				return ta - tb;
			});

			const lanes: { endTime: number }[] = [];
			const result: {
				session: AggregatedSession;
				leftPx: number;
				widthPx: number;
				laneIndex: number;
			}[] = [];

			for (const session of sorted) {
				const start = session.started_at ?? timeRange.start;
				const end = effectiveEnd(session, start);
				const durationSec = Math.max(1, end - start);
				const rawWidthPx = durationSec * effectivePps;
				const widthPx = Math.min(MAX_SESSION_WIDTH_PX, Math.max(MIN_SESSION_WIDTH_PX, rawWidthPx));
				// Inverted axis: left = newest (timeRange.end), so session's right edge (end) is closer to left
				const leftPx = ((timeRange.end - end) / duration) * railWidthPx;

				// Lane assignment: pick smallest lane where last session ends <= this session starts
				let laneIndex = -1;
				for (let i = 0; i < lanes.length; i++) {
					if (lanes[i].endTime <= start) {
						laneIndex = i;
						break;
					}
				}
				if (laneIndex < 0) {
					laneIndex = lanes.length;
					lanes.push({ endTime: 0 });
				}
				lanes[laneIndex].endTime = end;

				result.push({ session, leftPx, widthPx, laneIndex });
			}
			return result;
		})()
	);

	const laneCount = $derived(
		positionedSessions.length === 0
			? 0
			: Math.max(...positionedSessions.map((p) => p.laneIndex)) + 1
	);
	const sessionsStripHeightPx = $derived(laneCount * LANE_HEIGHT_PX);

	// Scroll to start (left = most recent) so newest sessions are in view on load
	$effect(() => {
		const el = scrollContainerEl;
		if (!el || sessions.length === 0) return;
		el.scrollLeft = 0;
	});

	function handleDayClick(scrollPositionPx: number) {
		if (scrollContainerEl) {
			scrollContainerEl.scrollLeft = scrollPositionPx;
		}
	}

	// Day boundaries for sticky nav (newest first). Use LOCAL calendar days so "today" displays correctly.
	const dayBookmarks = $derived(
		(function () {
			const list: { pos: number; label: string; ts: number }[] = [];
			const startDate = new Date(timeRange.start * 1000);
			const endDate = new Date(timeRange.end * 1000);
			const startLocalDay = new Date(
				startDate.getFullYear(),
				startDate.getMonth(),
				startDate.getDate()
			);
			const todayLocal = new Date();
			todayLocal.setHours(0, 0, 0, 0);
			const endLocalDay = new Date(Math.max(endDate.getTime(), todayLocal.getTime()));
			endLocalDay.setHours(0, 0, 0, 0);
			for (let d = new Date(startLocalDay); d <= endLocalDay; d.setDate(d.getDate() + 1)) {
				const ts = Math.floor(d.getTime() / 1000);
				list.push({ pos: timeToPos(ts), label: format(d, 'EEE d'), ts });
			}
			return list.reverse();
		})()
	);

	const scaleLabel = $derived(
		duration >= SECONDS_PER_DAY
			? `${format(new Date(timeRange.end * 1000), 'MMM d')} – ${format(new Date(timeRange.start * 1000), 'MMM d')}`
			: `${format(new Date(timeRange.end * 1000), 'HH:mm')} – ${format(new Date(timeRange.start * 1000), 'HH:mm')}`
	);
</script>

<div class={cn('flex flex-col overflow-hidden rounded-lg border bg-muted/20', className)}>
	<!-- Sticky top bar: scale + day navigation (stays visible, does not scroll) -->
	<div
		class="sticky top-0 z-10 flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-background/95 px-4 py-2 backdrop-blur supports-backdrop-filter:bg-background/80"
	>
		<span class="text-[10px] text-muted-foreground">{scaleLabel}</span>
		<div class="flex flex-wrap gap-1">
			{#each dayBookmarks as { pos, label, ts }}
				<button
					type="button"
					class="rounded border border-border/50 px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
					title="Go to {label}"
					onclick={() => handleDayClick(pos)}
				>
					{label}
				</button>
			{/each}
		</div>
	</div>
	<div
		class="shrink-0 overflow-x-auto overflow-y-hidden scroll-smooth px-4"
		style="scroll-behavior: smooth;"
		bind:this={scrollContainerEl}
	>
		<div class="flex min-w-0 flex-col" style="min-width: min(100%, {railWidthPx}px);">
			<TimelineRail
				timeStart={timeRange.start}
				timeEnd={timeRange.end}
				pixelsPerSecond={effectivePps}
				inverted={true}
				onDayClick={handleDayClick}
			/>
			<div
				class="relative py-4 pb-6"
				style="min-width: min(100%, {railWidthPx}px); width: {railWidthPx}px; height: {sessionsStripHeightPx}px;"
			>
				{#if sessions.length === 0}
					<p
						class="absolute inset-0 flex items-center justify-center py-8 text-center text-sm text-muted-foreground"
					>
						No sessions in this view. Adjust the project filter or run Conductor to see activity.
					</p>
				{:else}
					{#each positionedSessions as { session, leftPx, widthPx, laneIndex } (session._id)}
						{@const sessionEvents = eventsBySession[session._id] ?? []}
						{@const isExpanded = expandedIds.has(session._id) && sessionEvents.length >= 3}
						{@const effectiveHeightPx = isExpanded
							? Math.round((LANE_HEIGHT_PX - 8) * 1.5)
							: LANE_HEIGHT_PX - 8}
						<div
							class="absolute top-0 cursor-pointer"
							style="left: {leftPx}px; width: {widthPx}px; top: {laneIndex *
								LANE_HEIGHT_PX}px; height: {effectiveHeightPx}px; z-index: {focusedSessionId ===
							session._id
								? 20
								: 0};"
							role="button"
							tabindex="0"
							onmouseenter={() => (focusedSessionId = session._id)}
							onclick={() => (focusedSessionId = session._id)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									focusedSessionId = session._id;
								}
							}}
						>
							<SessionBlock
								{session}
								events={eventsBySession[session._id] ?? []}
								isActive={activeSession?._id === session._id}
								{widthPx}
								{isExpanded}
								onToggleExpand={() => {
									toggleExpanded(session._id);
									focusedSessionId = session._id;
								}}
							/>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	</div>
</div>
