<script lang="ts">
	import type { AggregatedMemory } from '$lib/server/db/types';
	import * as HoverCard from '$lib/components/ui/hover-card';
	import { Badge } from '$lib/components/ui/badge';
	import { Brain } from 'lucide-svelte';
	import { format } from 'date-fns';
	import { cn } from '$lib/utils';

	interface Props {
		memory: AggregatedMemory;
		class?: string;
	}

	let { memory, class: className = '' }: Props = $props();
</script>

<HoverCard.Root openDelay={400} closeDelay={150}>
	<HoverCard.Trigger>
		{#snippet child({ props })}
			<div
				{...props}
				class={cn(
					'flex cursor-default items-center gap-1.5 rounded-full border bg-muted/50 px-2 py-1 text-xs',
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
		{/snippet}
	</HoverCard.Trigger>
	<HoverCard.Content class="max-h-64 w-72 overflow-y-auto p-3" align="center">
		<p class="text-sm font-medium">{memory.name}</p>
		{#if memory._parsedTags?.length}
			<div class="mt-1 flex flex-wrap gap-1">
				{#each memory._parsedTags as tag}
					<Badge variant="outline" class="text-[10px]">{tag}</Badge>
				{/each}
			</div>
		{/if}
		{#if memory.content}
			<p class="mt-2 text-xs whitespace-pre-wrap text-muted-foreground">{memory.content}</p>
		{/if}
		<p class="mt-2 text-[10px] text-muted-foreground">
			{format(memory.created_at * 1000, 'MMM d, HH:mm')}
		</p>
	</HoverCard.Content>
</HoverCard.Root>
