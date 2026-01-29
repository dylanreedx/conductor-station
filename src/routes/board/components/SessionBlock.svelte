<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { AggregatedSession } from '$lib/server/db/types';
	import type { TimelineEvent } from '$lib/board/types';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Clock, Loader2, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-svelte';
	import { format } from 'date-fns';
	import FeatureCard from './FeatureCard.svelte';
	import ErrorIndicator from './ErrorIndicator.svelte';
	import MemoryChip from './MemoryChip.svelte';
	import CommitDot from './CommitDot.svelte';
	import HandoffMarker from './HandoffMarker.svelte';
	import QualityIndicator from './QualityIndicator.svelte';
	import { cn } from '$lib/utils';

	interface Props {
		session: AggregatedSession;
		events: TimelineEvent[];
		isActive: boolean;
		/** Width in px when positioned on timeline (variable-width mode) */
		widthPx?: number;
		/** When true, card is expanded (50% wider) - board view only */
		isExpanded?: boolean;
		/** Called when expand toggle is clicked - board view only */
		onToggleExpand?: () => void;
		class?: string;
	}

	let {
		session,
		events,
		isActive,
		widthPx,
		isExpanded = false,
		onToggleExpand,
		class: className = ''
	}: Props = $props();

	const displayStatus = $derived(session._displayStatus ?? session.status);
	let completing = $state(false);

	function formatTs(ts: number | null): string {
		if (ts == null) return '—';
		try {
			return format(new Date(ts * 1000), 'MMM d HH:mm');
		} catch {
			return '—';
		}
	}

	async function markComplete() {
		if (completing || displayStatus === 'completed') return;
		completing = true;
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
			completing = false;
		}
	}
</script>

<div
	class={cn(
		'flex h-full flex-col overflow-hidden rounded-lg border bg-card p-3 shadow-sm transition-shadow',
		widthPx != null
			? 'min-w-0 shrink-0'
			: 'max-h-[320px] max-w-[320px] min-w-[260px] snap-start p-4',
		isActive && 'animate-pulse border-primary ring-2 ring-primary/20',
		className
	)}
	style={widthPx != null ? 'width: 100%; min-width: 0;' : undefined}
>
	<div
		class={cn(
			'flex shrink-0 flex-wrap items-center justify-between gap-2',
			widthPx != null && widthPx < 200 && 'gap-1'
		)}
	>
		<div class="flex min-w-0 items-center gap-2">
			<div
				class={cn(
					'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2',
					widthPx != null && widthPx < 200 && 'h-6 w-6',
					isActive ? 'border-primary bg-primary/10' : 'border-muted bg-muted/50'
				)}
			>
				{#if isActive}
					<Loader2 class="h-3.5 w-3.5 animate-spin text-primary" />
				{:else if displayStatus === 'completed'}
					<CheckCircle2 class="h-3.5 w-3.5 text-green-500" />
				{:else}
					<Clock class="h-3.5 w-3.5 text-muted-foreground" />
				{/if}
			</div>
			<div
				class="min-w-0"
				title={widthPx != null && widthPx < 180
					? `Started: ${formatTs(session.started_at)}`
					: undefined}
			>
				<p class="truncate text-sm font-medium">
					Session #{session.session_number}
					<span class="ml-1 text-xs text-muted-foreground">{session._sourceAlias}</span>
				</p>
				{#if widthPx == null || widthPx >= 180}
					<p class="truncate text-[10px] text-muted-foreground">{formatTs(session.started_at)}</p>
				{:else if widthPx != null}
					<p class="truncate text-[10px] text-muted-foreground">
						{session.started_at != null
							? format(new Date(session.started_at * 1000), 'HH:mm')
							: '—'}
					</p>
				{/if}
			</div>
		</div>
		<div class="flex shrink-0 items-center gap-1.5">
			{#if widthPx != null && onToggleExpand && events.length >= 5}
				<button
					type="button"
					class="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					title={isExpanded ? 'Collapse' : 'Expand'}
					onclick={(e) => {
						e.stopPropagation();
						onToggleExpand();
					}}
				>
					{#if isExpanded}
						<ChevronUp class="h-3.5 w-3.5" />
					{:else}
						<ChevronDown class="h-3.5 w-3.5" />
					{/if}
				</button>
			{/if}
			{#if displayStatus !== 'completed' && (widthPx == null || widthPx >= 200)}
				<Button
					variant="outline"
					size="sm"
					class="shrink-0"
					disabled={completing}
					onclick={markComplete}
					title="Mark session complete"
				>
					<CheckCircle2 class="size-3.5" />
					{completing ? '…' : 'Complete'}
				</Button>
			{/if}
			<Badge variant={isActive ? 'default' : 'secondary'} class="text-[10px]">{displayStatus}</Badge
			>
		</div>
	</div>

	{#if session.progress_notes && (widthPx == null || widthPx >= 220)}
		<p class="mt-1.5 line-clamp-2 shrink-0 text-xs text-muted-foreground">
			{session.progress_notes}
		</p>
	{/if}

	<div
		class={cn(
			'scrollbar-none flex min-h-0 flex-1 flex-wrap content-start overflow-y-auto',
			widthPx != null ? 'mt-1.5 gap-1.5' : 'mt-3 gap-2'
		)}
	>
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
