<script lang="ts">
	import type { AggregatedFeature } from '$lib/server/db/types';
	import * as HoverCard from '$lib/components/ui/hover-card';
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

	function parseJson(s: string | null): string[] {
		if (!s) return [];
		try {
			const v = JSON.parse(s);
			return Array.isArray(v) ? v : [];
		} catch {
			return [];
		}
	}

	const steps = $derived(parseJson(feature.steps));
</script>

<HoverCard.Root openDelay={400} closeDelay={150}>
	<HoverCard.Trigger>
		{#snippet child({ props })}
			<div
				{...props}
				class={cn(
					'cursor-default rounded-md border bg-background px-2 py-1.5 text-xs shadow-sm',
					className
				)}
			>
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
		{/snippet}
	</HoverCard.Trigger>
	<HoverCard.Content class="max-h-64 w-80 overflow-y-auto p-3" align="center">
		<p class="text-sm font-medium">{feature.description}</p>
		<div class="mt-1 flex items-center gap-1.5">
			<Badge variant={statusVariant} class="text-[10px]">{feature.status}</Badge>
			<span class="text-muted-foreground">phase {feature.phase}</span>
			{#if feature.attempt_count > 0}
				<span class="text-muted-foreground">attempts: {feature.attempt_count}</span>
			{/if}
		</div>
		{#if steps.length}
			<p class="mt-2 text-xs font-medium">Steps</p>
			<ul class="list-inside list-disc text-xs text-muted-foreground">
				{#each steps as step}
					<li>{step}</li>
				{/each}
			</ul>
		{/if}
		{#if feature.last_error}
			<p class="mt-2 text-xs font-medium text-destructive">Last error</p>
			<p class="text-xs whitespace-pre-wrap text-muted-foreground">{feature.last_error}</p>
		{/if}
	</HoverCard.Content>
</HoverCard.Root>
