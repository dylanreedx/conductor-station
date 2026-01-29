<script lang="ts">
	import { format } from 'date-fns';
	import { cn } from '$lib/utils';

	const SECONDS_PER_DAY = 86400;

	interface Props {
		timeStart: number;
		timeEnd: number;
		pixelsPerSecond: number;
		/** Called with scroll position in px when a day bookmark is clicked */
		onDayClick?: (scrollPositionPx: number) => void;
		class?: string;
	}

	let { timeStart, timeEnd, pixelsPerSecond, onDayClick, class: className = '' }: Props = $props();

	const duration = $derived(Math.max(1, timeEnd - timeStart));
	const widthPx = $derived(duration * pixelsPerSecond);

	// Day boundaries for quick navigation (start of each day in [timeStart, timeEnd])
	const dayBookmarks = $derived(
		(function () {
			const list: { pos: number; label: string; ts: number }[] = [];
			const dayStart = Math.floor(timeStart / SECONDS_PER_DAY) * SECONDS_PER_DAY;
			let t = dayStart;
			while (t <= timeEnd) {
				if (t >= timeStart) {
					const pos = ((t - timeStart) / duration) * widthPx;
					list.push({ pos, label: format(new Date(t * 1000), 'EEE d'), ts: t });
				}
				t += SECONDS_PER_DAY;
			}
			return list;
		})()
	);

	function handleDayClick(pos: number) {
		onDayClick?.(pos);
	}

	// Tick interval: aim for ~6–12 ticks; use 1h, 6h, 1d, 1w
	const tickIntervalSec = $derived(
		duration <= 3600 * 2
			? 1800
			: duration <= 3600 * 24
				? 3600
				: duration <= 3600 * 24 * 7
					? 3600 * 6
					: 3600 * 24
	);

	const ticks = $derived(
		(function () {
			const list: { pos: number; label: string; ts: number }[] = [];
			let t = Math.floor(timeStart / tickIntervalSec) * tickIntervalSec;
			while (t <= timeEnd) {
				const pos = ((t - timeStart) / duration) * widthPx;
				const label =
					tickIntervalSec >= 86400
						? format(new Date(t * 1000), 'MMM d')
						: format(new Date(t * 1000), 'HH:mm');
				list.push({ pos, label, ts: t });
				t += tickIntervalSec;
			}
			return list;
		})()
	);

	const nowTs = $derived(Math.floor(Date.now() / 1000));
	const nowPos = $derived(
		nowTs >= timeStart && nowTs <= timeEnd ? ((nowTs - timeStart) / duration) * widthPx : null
	);
</script>

<div
	class={cn('relative shrink-0 border-b border-border', className)}
	style="width: {widthPx}px; min-width: 100%;"
	role="presentation"
>
	<!-- Day bookmarks: quick navigation -->
	{#if dayBookmarks.length > 0 && onDayClick}
		<div class="flex h-6 items-center border-b border-border/50">
			{#each dayBookmarks as { pos, label, ts }}
				<button
					type="button"
					class="absolute top-0 flex h-6 items-center border-l border-border/50 pl-1.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
					style="left: {pos}px;"
					title="Go to {label}"
					onclick={() => handleDayClick(pos)}
				>
					{label}
				</button>
			{/each}
		</div>
	{/if}
	<div class="relative h-8">
		{#each ticks as { pos, label }}
			<div
				class="absolute top-0 flex flex-col items-start border-l border-border pt-0.5 pl-1 text-[10px] text-muted-foreground"
				style="left: {pos}px;"
			>
				<span>{label}</span>
			</div>
		{/each}
		{#if nowPos != null}
			<div
				class="absolute top-0 bottom-0 w-0.5 bg-primary"
				style="left: {nowPos}px;"
				title="Now"
				aria-hidden="true"
			></div>
		{/if}
	</div>
</div>
