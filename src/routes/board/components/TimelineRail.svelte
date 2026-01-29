<script lang="ts">
	import { format } from 'date-fns';
	import { cn } from '$lib/utils';

	const SECONDS_PER_DAY = 86400;

	interface Props {
		timeStart: number;
		timeEnd: number;
		pixelsPerSecond: number;
		/** When true, left = newest (timeEnd), right = oldest (timeStart) */
		inverted?: boolean;
		/** Called with scroll position in px when a day bookmark is clicked */
		onDayClick?: (scrollPositionPx: number) => void;
		class?: string;
	}

	let {
		timeStart,
		timeEnd,
		pixelsPerSecond,
		inverted = false,
		onDayClick,
		class: className = ''
	}: Props = $props();

	const duration = $derived(Math.max(1, timeEnd - timeStart));
	const widthPx = $derived(duration * pixelsPerSecond);

	function timeToPos(t: number): number {
		return inverted ? ((timeEnd - t) / duration) * widthPx : ((t - timeStart) / duration) * widthPx;
	}

	// Day boundaries for quick navigation. Use LOCAL calendar days so "today" displays correctly.
	const dayBookmarks = $derived(
		(function () {
			const list: { pos: number; label: string; ts: number }[] = [];
			const startDate = new Date(timeStart * 1000);
			const endDate = new Date(timeEnd * 1000);
			const startLocalDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
			const todayLocal = new Date();
			todayLocal.setHours(0, 0, 0, 0);
			const endLocalDay = new Date(Math.max(endDate.getTime(), todayLocal.getTime()));
			endLocalDay.setHours(0, 0, 0, 0);
			for (let d = new Date(startLocalDay); d <= endLocalDay; d.setDate(d.getDate() + 1)) {
				const ts = Math.floor(d.getTime() / 1000);
				list.push({ pos: timeToPos(ts), label: format(d, 'EEE d'), ts });
			}
			return list;
		})()
	);

	function handleDayClick(pos: number) {
		onDayClick?.(pos);
	}

	// Consistent tick density: aim for 8–12 ticks; round to nice intervals (15min, 1h, 6h, 24h)
	const TARGET_TICKS = 10;
	const tickIntervalSec = $derived(
		(function () {
			const raw = duration / TARGET_TICKS;
			const hour = 3600;
			const day = SECONDS_PER_DAY;
			if (raw <= hour * 0.5) return Math.max(900, Math.round(raw / 900) * 900); // 15min steps
			if (raw <= hour * 2) return Math.round(raw / hour) * hour || hour;
			if (raw <= hour * 12) return Math.round(raw / (hour * 2)) * (hour * 2) || hour * 2;
			if (raw <= day) return Math.round(raw / (hour * 6)) * (hour * 6) || hour * 6;
			return Math.round(raw / day) * day || day;
		})()
	);

	const ticks = $derived(
		(function () {
			const list: { pos: number; label: string; ts: number }[] = [];
			let t = Math.floor(timeStart / tickIntervalSec) * tickIntervalSec;
			while (t <= timeEnd) {
				const label =
					tickIntervalSec >= SECONDS_PER_DAY
						? format(new Date(t * 1000), 'MMM d')
						: format(new Date(t * 1000), 'HH:mm');
				list.push({ pos: timeToPos(t), label, ts: t });
				t += tickIntervalSec;
			}
			return list;
		})()
	);

	const nowTs = $derived(Math.floor(Date.now() / 1000));
	const nowPos = $derived(nowTs >= timeStart && nowTs <= timeEnd ? timeToPos(nowTs) : null);

	// Scale label: when inverted, left = newest so show newest first
	const scaleLabel = $derived(
		inverted
			? duration >= SECONDS_PER_DAY
				? `${format(new Date(timeEnd * 1000), 'MMM d')} – ${format(new Date(timeStart * 1000), 'MMM d')}`
				: `${format(new Date(timeEnd * 1000), 'HH:mm')} – ${format(new Date(timeStart * 1000), 'HH:mm')}`
			: duration >= SECONDS_PER_DAY
				? `${format(new Date(timeStart * 1000), 'MMM d')} – ${format(new Date(timeEnd * 1000), 'MMM d')}`
				: `${format(new Date(timeStart * 1000), 'HH:mm')} – ${format(new Date(timeEnd * 1000), 'HH:mm')}`
	);
</script>

<div
	class={cn('relative shrink-0 border-b border-border', className)}
	style="width: {widthPx}px; min-width: 100%;"
	role="presentation"
>
	<!-- Scale label: range context -->
	<div
		class="flex h-5 shrink-0 items-center border-b border-border/30 px-1 text-[10px] text-muted-foreground"
	>
		{scaleLabel}
	</div>
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
