<script lang="ts">
	import type { AggregatedQualityReflection } from '$lib/server/db/types';
	import * as Popover from '$lib/components/ui/popover';
	import { FileWarning } from 'lucide-svelte';
	import { format } from 'date-fns';
	import { cn } from '$lib/utils';

	interface Props {
		quality: AggregatedQualityReflection;
		class?: string;
	}

	let { quality, class: className = '' }: Props = $props();

	let open = $state(false);

	function parseJson(s: string | null): string[] {
		if (!s) return [];
		try {
			const v = JSON.parse(s);
			return Array.isArray(v) ? v : [];
		} catch {
			return [];
		}
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger>
		{#snippet child({ props })}
			<button
				{...props}
				type="button"
				class={cn(
					'flex items-center gap-1.5 rounded-md border border-amber-500/50 bg-amber-500/10 px-2 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-500/20 dark:text-amber-400',
					className
				)}
			>
				<FileWarning class="h-3.5 w-3.5" />
				{quality.reflection_type}
			</button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="max-h-64 w-72 overflow-y-auto p-3" align="center">
		<p class="text-xs text-muted-foreground">
			{format(quality.created_at * 1000, 'MMM d, HH:mm')}
		</p>
		{#each ['shortcuts_taken', 'tests_skipped', 'known_limitations', 'technical_debt', 'deferred_work'] as key}
			{@const arr = parseJson(quality[key as keyof typeof quality] as string | null)}
			{#if arr.length}
				<p class="mt-2 text-xs font-medium capitalize">{key.replace('_', ' ')}</p>
				<ul class="list-inside list-disc text-xs text-muted-foreground">
					{#each arr as item}
						<li>{item}</li>
					{/each}
				</ul>
			{/if}
		{/each}
	</Popover.Content>
</Popover.Root>
