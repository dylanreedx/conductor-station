<script lang="ts">
	import type { AggregatedFeature } from '$lib/server/db/types';
	import { Badge } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils';

	interface Props {
		feature: AggregatedFeature;
		class?: string;
	}

	let { feature, class: className = '' }: Props = $props();

	const statusVariant = $derived(
		feature.status === 'passed'
			? 'default'
			: feature.status === 'failed' || feature.status === 'blocked'
				? 'destructive'
				: 'secondary'
	);
</script>

<div class={cn('rounded-md border bg-background px-2 py-1.5 text-xs shadow-sm', className)}>
	<p class="line-clamp-1 font-medium text-foreground">{feature.description}</p>
	<div class="mt-1 flex items-center gap-1.5">
		<Badge variant={statusVariant} class="text-[10px]">
			{feature.status}
		</Badge>
		<span class="text-muted-foreground">phase {feature.phase}</span>
		{#if feature.attempt_count > 0}
			<span class="text-muted-foreground">attempts: {feature.attempt_count}</span>
		{/if}
	</div>
	{#if feature.last_error}
		<p class="mt-1 line-clamp-2 text-[10px] text-destructive">{feature.last_error}</p>
	{/if}
</div>
