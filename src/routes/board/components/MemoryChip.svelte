<script lang="ts">
	import type { AggregatedMemory } from '$lib/server/db/types';
	import { Badge } from '$lib/components/ui/badge';
	import { Brain } from 'lucide-svelte';
	import { cn } from '$lib/utils';

	interface Props {
		memory: AggregatedMemory;
		class?: string;
	}

	let { memory, class: className = '' }: Props = $props();
</script>

<div
	class={cn(
		'flex items-center gap-1.5 rounded-full border bg-muted/50 px-2 py-1 text-xs',
		className
	)}
>
	<Brain class="h-3 w-3 text-muted-foreground" />
	<span class="truncate font-medium">{memory.name}</span>
	{#if memory._parsedTags?.length}
		<div class="flex gap-0.5">
			{#each memory._parsedTags.slice(0, 3) as tag}
				<Badge variant="outline" class="px-1 text-[10px]">{tag}</Badge>
			{/each}
		</div>
	{/if}
</div>
