<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { TimelineData } from '$lib/board/types';
	import type { TimelineEvent } from '$lib/board/types';
	import type { AggregatedSession } from '$lib/server/db/types';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Clock, Loader2, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-svelte';
	import { format, formatDistanceToNow } from 'date-fns';
	import FeatureCard from './FeatureCard.svelte';
	import ErrorIndicator from './ErrorIndicator.svelte';
	import MemoryChip from './MemoryChip.svelte';
	import CommitDot from './CommitDot.svelte';
	import HandoffMarker from './HandoffMarker.svelte';
	import QualityIndicator from './QualityIndicator.svelte';
	import { cn } from '$lib/utils';

	interface Props {
		timelineData: TimelineData;
		class?: string;
	}

	let { timelineData, class: className = '' }: Props = $props();

	const sessions = $derived(timelineData.sessions);
	const eventsBySession = $derived(timelineData.eventsBySession);
	const activeSession = $derived(timelineData.activeSession);

	const displayStatus = (s: (typeof sessions)[0]) => s._displayStatus ?? s.status;

	// Track which session is being marked complete
	let completingId = $state<string | null>(null);

	async function markComplete(session: AggregatedSession) {
		if (completingId || displayStatus(session) === 'completed') return;
		completingId = session._id;
		try {
			const res = await fetch('/api/sessions/complete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sessionId: session._id })
			});
			if (res.ok) {
				await invalidateAll();
			}
		} finally {
			completingId = null;
		}
	}

	// Track which session rows are expanded (by session._id)
	let expandedIds = $state<Set<string>>(new Set());

	function toggleExpanded(sessionId: string) {
		expandedIds = new Set(expandedIds);
		if (expandedIds.has(sessionId)) {
			expandedIds.delete(sessionId);
		} else {
			expandedIds.add(sessionId);
		}
	}

	function formatTs(ts: number | null): string {
		if (ts == null) return '—';
		try {
			return format(new Date(ts * 1000), 'MMM d, yyyy HH:mm');
		} catch {
			return '—';
		}
	}

	function relativeTs(ts: number | null): string {
		if (ts == null) return '';
		try {
			return formatDistanceToNow(new Date(ts * 1000), { addSuffix: true });
		} catch {
			return '';
		}
	}

	function eventSummary(events: TimelineEvent[]): string {
		const counts: Record<string, number> = {};
		for (const e of events) {
			counts[e.type] = (counts[e.type] ?? 0) + 1;
		}
		const parts: string[] = [];
		if (counts.feature) parts.push(`${counts.feature} feature${counts.feature !== 1 ? 's' : ''}`);
		if (counts.handoff) parts.push(`${counts.handoff} handoff${counts.handoff !== 1 ? 's' : ''}`);
		if (counts.commit) parts.push(`${counts.commit} commit${counts.commit !== 1 ? 's' : ''}`);
		if (counts.error) parts.push(`${counts.error} error${counts.error !== 1 ? 's' : ''}`);
		if (counts.memory) parts.push(`${counts.memory} memory`);
		if (counts.quality) parts.push(`${counts.quality} quality`);
		return parts.length ? parts.join(', ') : 'No events';
	}
</script>

<div class={cn('rounded-lg border bg-muted/20', className)}>
	{#if sessions.length === 0}
		<p class="py-8 text-center text-sm text-muted-foreground">
			No sessions in this view. Adjust the project filter or run Conductor to see activity.
		</p>
	{:else}
		<div class="relative space-y-0 p-4">
			<!-- Timeline line -->
			<div class="absolute top-4 bottom-4 left-7 w-px bg-border" aria-hidden="true"></div>
			{#each sessions as session (session._id)}
				{@const events = eventsBySession[session._id] ?? []}
				{@const isActive = activeSession?._id === session._id}
				{@const isExpanded = expandedIds.has(session._id)}
				<div class="relative flex gap-4 pb-6 last:pb-0">
					<!-- Timeline dot -->
					<div
						class={cn(
							'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-background',
							isActive ? 'border-primary' : 'border-muted'
						)}
					>
						{#if isActive}
							<Loader2 class="h-4 w-4 animate-spin text-primary" />
						{:else if displayStatus(session) === 'completed'}
							<CheckCircle2 class="h-4 w-4 text-green-500" />
						{:else}
							<Clock class="h-4 w-4 text-muted-foreground" />
						{/if}
					</div>
					<!-- Session row -->
					<div class="min-w-0 flex-1 rounded-lg border bg-card shadow-sm">
						<button
							type="button"
							class="flex w-full flex-wrap items-center justify-between gap-2 p-4 text-left transition-colors hover:bg-muted/50"
							onclick={() => toggleExpanded(session._id)}
							aria-expanded={isExpanded}
						>
							<div class="flex min-w-0 flex-1 items-center gap-2">
								{#if isExpanded}
									<ChevronDown class="h-4 w-4 shrink-0 text-muted-foreground" />
								{:else}
									<ChevronRight class="h-4 w-4 shrink-0 text-muted-foreground" />
								{/if}
								<div class="min-w-0">
									<p class="font-medium">
										Session #{session.session_number}
										<span class="ml-2 text-muted-foreground">{session._sourceAlias}</span>
									</p>
									<p class="text-xs text-muted-foreground">
										{#if session.started_at}
											{formatTs(session.started_at)}
											{#if isActive}
												<span class="ml-1">({relativeTs(session.started_at)})</span>
											{/if}
										{:else}
											Not started
										{/if}
									</p>
								</div>
							</div>
							<div class="flex items-center gap-2">
								{#if displayStatus(session) !== 'completed'}
									<Button
										variant="outline"
										size="sm"
										class="shrink-0"
										disabled={completingId === session._id}
										onclick={() => markComplete(session)}
										title="Mark session complete"
									>
										<CheckCircle2 class="size-3.5" />
										{completingId === session._id ? '…' : 'Complete'}
									</Button>
								{/if}
								<Badge variant={isActive ? 'default' : 'secondary'}>{displayStatus(session)}</Badge>
							</div>
							<span class="w-full text-left text-xs text-muted-foreground sm:w-auto">
								{eventSummary(events)}
							</span>
						</button>
						{#if session.progress_notes && !isExpanded}
							<p class="line-clamp-2 border-t px-4 py-2 text-sm text-muted-foreground">
								{session.progress_notes}
							</p>
						{/if}
						{#if isExpanded}
							<div class="border-t p-4">
								{#if session.progress_notes}
									<p class="mb-3 text-sm text-muted-foreground">{session.progress_notes}</p>
								{/if}
								{#if session.completed_at && displayStatus(session) === 'completed'}
									<p class="mb-3 text-xs text-muted-foreground">
										Completed {formatTs(session.completed_at)}
									</p>
								{/if}
								<div class="flex max-h-[280px] flex-wrap gap-2 overflow-y-auto">
									{#each events as event (`${event.type}-${event.data._id}-${event.timestamp}`)}
										{#if event.type === 'feature'}
											<FeatureCard feature={event.data} />
										{:else if event.type === 'handoff'}
											<HandoffMarker handoff={event.data} />
										{:else if event.type === 'commit'}
											<CommitDot commit={event.data} />
										{:else if event.type === 'error'}
											<ErrorIndicator error={event.data} />
										{:else if event.type === 'memory'}
											<MemoryChip memory={event.data} />
										{:else if event.type === 'quality'}
											<QualityIndicator quality={event.data} />
										{/if}
									{/each}
								</div>
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
