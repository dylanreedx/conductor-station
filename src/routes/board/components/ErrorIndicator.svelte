<script lang="ts">
	import type { AggregatedFeatureError } from '$lib/server/db/types';
	import { AlertTriangle } from 'lucide-svelte';
	import { cn } from '$lib/utils';

	interface Props {
		error: AggregatedFeatureError;
		class?: string;
	}

	let { error, class: className = '' }: Props = $props();
</script>

<div
	class={cn(
		'flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-2 py-1.5 text-xs',
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
