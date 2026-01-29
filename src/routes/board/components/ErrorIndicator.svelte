<script lang="ts">
	import type { AggregatedFeatureError } from '$lib/server/db/types';
	import * as HoverCard from '$lib/components/ui/hover-card';
	import { AlertTriangle } from 'lucide-svelte';
	import { format } from 'date-fns';
	import { cn } from '$lib/utils';

	interface Props {
		error: AggregatedFeatureError;
		class?: string;
	}

	let { error, class: className = '' }: Props = $props();
</script>

<HoverCard.Root openDelay={400} closeDelay={150}>
	<HoverCard.Trigger>
		{#snippet child({ props })}
			<div
				{...props}
				class={cn(
					'flex cursor-default items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-2 py-1.5 text-xs',
					className
				)}
			>
				<AlertTriangle class="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
				<div class="min-w-0 flex-1">
					<p class="font-medium text-destructive">{error.error_type}</p>
					<p class="line-clamp-2 text-muted-foreground">{error.error}</p>
					{#if error.attempt_number > 1}
						<span class="text-muted-foreground">attempt #{error.attempt_number}</span>
					{/if}
				</div>
			</div>
		{/snippet}
	</HoverCard.Trigger>
	<HoverCard.Content class="max-h-64 w-80 overflow-y-auto p-3" align="center">
		<p class="text-sm font-medium text-destructive">{error.error_type}</p>
		<p class="mt-1 text-xs whitespace-pre-wrap text-muted-foreground">{error.error}</p>
		{#if error.stack_trace}
			<p class="mt-2 text-xs font-medium">Stack trace</p>
			<pre
				class="mt-1 max-h-32 overflow-auto text-[10px] whitespace-pre-wrap text-muted-foreground">{error.stack_trace}</pre>
		{/if}
		<p class="mt-2 text-[10px] text-muted-foreground">
			{format(error.created_at * 1000, 'MMM d, HH:mm')} · attempt #{error.attempt_number}
		</p>
	</HoverCard.Content>
</HoverCard.Root>
