<script lang="ts">
	import type { TimelineData } from '$lib/board/types';
	import SessionBlock from './SessionBlock.svelte';
	import TimelineRail from './TimelineRail.svelte';
	import { cn } from '$lib/utils';

	interface Props {
		timelineData: TimelineData;
		class?: string;
	}

	let { timelineData, class: className = '' }: Props = $props();

	const PIXELS_PER_SECOND = 0.8;
	const sessions = $derived(timelineData.sessions);
	const eventsBySession = $derived(timelineData.eventsBySession);
	const activeSession = $derived(timelineData.activeSession);
	const timeRange = $derived(timelineData.timeRange);

	const duration = $derived(Math.max(1, timeRange.end - timeRange.start));
	const railWidthPx = $derived(duration * PIXELS_PER_SECOND);
	let scrollContainerEl: HTMLDivElement | null = $state(null);

	// Auto-scroll to end (latest) when data updates
	$effect(() => {
		const el = scrollContainerEl;
		if (!el || !activeSession) return;
		el.scrollLeft = el.scrollWidth - el.clientWidth;
	});
</script>

<div class={cn('flex flex-col overflow-hidden rounded-lg border bg-muted/20', className)}>
	<div
		class="shrink-0 snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth"
		style="scroll-behavior: smooth;"
		bind:this={scrollContainerEl}
	>
		<TimelineRail
			timeStart={timeRange.start}
			timeEnd={timeRange.end}
			pixelsPerSecond={PIXELS_PER_SECOND}
		/>
		<div class="flex gap-4 p-4 pb-6 md:gap-6" style="min-width: min(100%, {railWidthPx}px);">
			{#if sessions.length === 0}
				<p class="py-8 text-center text-sm text-muted-foreground">
					No sessions in this view. Adjust the project filter or run Conductor to see activity.
				</p>
			{:else}
				{#each sessions as session (session._id)}
					<SessionBlock
						{session}
						events={eventsBySession[session._id] ?? []}
						isActive={activeSession?._id === session._id}
					/>
				{/each}
			{/if}
		</div>
	</div>
</div>
