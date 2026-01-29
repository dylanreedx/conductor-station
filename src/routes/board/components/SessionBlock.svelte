<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { AggregatedSession } from '$lib/server/db/types';
	import type { TimelineEvent } from '$lib/board/types';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Clock, Loader2, CheckCircle2 } from 'lucide-svelte';
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
		class?: string;
	}

	let { session, events, isActive, class: className = '' }: Props = $props();

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
		'flex max-h-[320px] max-w-[320px] min-w-[260px] shrink-0 snap-start flex-col overflow-hidden rounded-lg border bg-card p-4 shadow-sm transition-shadow',
		isActive && 'animate-pulse border-primary ring-2 ring-primary/20',
		className
	)}
>
	<div class="flex shrink-0 flex-wrap items-center justify-between gap-2">
		<div class="flex items-center gap-2">
			<div
				class={cn(
					'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2',
					isActive ? 'border-primary bg-primary/10' : 'border-muted bg-muted/50'
				)}
			>
				{#if isActive}
					<Loader2 class="h-4 w-4 animate-spin text-primary" />
				{:else if displayStatus === 'completed'}
					<CheckCircle2 class="h-4 w-4 text-green-500" />
				{:else}
					<Clock class="h-4 w-4 text-muted-foreground" />
				{/if}
			</div>
			<div>
				<p class="font-medium">
					Session #{session.session_number}
					<span class="ml-1 text-xs text-muted-foreground">{session._sourceAlias}</span>
				</p>
				<p class="text-xs text-muted-foreground">{formatTs(session.started_at)}</p>
			</div>
		</div>
		<div class="flex items-center gap-1.5">
			{#if displayStatus !== 'completed'}
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
			<Badge variant={isActive ? 'default' : 'secondary'}>{displayStatus}</Badge>
		</div>
	</div>

	{#if session.progress_notes}
		<p class="mt-2 line-clamp-2 shrink-0 text-xs text-muted-foreground">{session.progress_notes}</p>
	{/if}

	<div class="mt-3 flex min-h-0 flex-1 flex-wrap content-start gap-2 overflow-y-auto">
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
