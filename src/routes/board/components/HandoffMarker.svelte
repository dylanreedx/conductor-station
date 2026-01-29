<script lang="ts">
	import type { AggregatedHandoff } from '$lib/server/db/types';
	import * as HoverCard from '$lib/components/ui/hover-card';
	import { ArrowRightLeft } from 'lucide-svelte';
	import { format } from 'date-fns';
	import { cn } from '$lib/utils';

	interface Props {
		handoff: AggregatedHandoff;
		class?: string;
	}

	let { handoff, class: className = '' }: Props = $props();

	function parseJson(s: string | null): string[] {
		if (!s) return [];
		try {
			const v = JSON.parse(s);
			return Array.isArray(v) ? v : [];
		} catch {
			return [];
		}
	}

	const nextSteps = $derived(parseJson(handoff.next_steps));
	const blockers = $derived(parseJson(handoff.blockers));
	const filesModified = $derived(parseJson(handoff.files_modified));
</script>

<HoverCard.Root openDelay={400} closeDelay={150}>
	<HoverCard.Trigger>
		{#snippet child({ props })}
			<button
				{...props}
				type="button"
				class={cn(
					'flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-1.5 text-xs font-medium transition-colors hover:bg-muted',
					className
				)}
			>
				<ArrowRightLeft class="h-3.5 w-3.5 text-muted-foreground" />
				Handoff
			</button>
		{/snippet}
	</HoverCard.Trigger>
	<HoverCard.Content class="w-80 p-3" align="center">
		<p class="text-xs text-muted-foreground">
			{format(handoff.created_at * 1000, 'MMM d, yyyy HH:mm')}
		</p>
		{#if handoff.current_task}
			<p class="mt-2 text-sm font-medium">Current task</p>
			<p class="text-sm text-muted-foreground">{handoff.current_task}</p>
		{/if}
		{#if nextSteps.length}
			<p class="mt-2 text-sm font-medium">Next steps</p>
			<ul class="list-inside list-disc text-sm text-muted-foreground">
				{#each nextSteps as step}
					<li>{step}</li>
				{/each}
			</ul>
		{/if}
		{#if blockers.length}
			<p class="mt-2 text-sm font-medium text-destructive">Blockers</p>
			<ul class="list-inside list-disc text-sm text-muted-foreground">
				{#each blockers as b}
					<li>{b}</li>
				{/each}
			</ul>
		{/if}
		{#if filesModified.length}
			<p class="mt-2 text-sm font-medium">Files modified</p>
			<ul class="max-h-24 overflow-y-auto font-mono text-xs text-muted-foreground">
				{#each filesModified as f}
					<li class="truncate">{f}</li>
				{/each}
			</ul>
		{/if}
		{#if handoff.git_commit}
			<p class="mt-2 font-mono text-xs text-muted-foreground">Commit: {handoff.git_commit}</p>
		{/if}
	</HoverCard.Content>
</HoverCard.Root>
