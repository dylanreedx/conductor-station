<script lang="ts">
	import type { AggregatedCommit } from '$lib/server/db/types';
	import * as Popover from '$lib/components/ui/popover';
	import { GitCommit } from 'lucide-svelte';
	import { format } from 'date-fns';
	import { cn } from '$lib/utils';

	interface Props {
		commit: AggregatedCommit;
		class?: string;
	}

	let { commit, class: className = '' }: Props = $props();

	let open = $state(false);
</script>

<Popover.Root bind:open>
	<Popover.Trigger>
		{#snippet child({ props })}
			<button
				{...props}
				type="button"
				class={cn(
					'flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary/50 bg-primary/10 text-primary transition-colors hover:bg-primary/20',
					className
				)}
				title={commit.message ?? commit.commit_hash}
			>
				<GitCommit class="h-3 w-3" />
			</button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-72 p-2" align="center">
		<p class="font-mono text-xs text-muted-foreground">{commit.commit_hash.slice(0, 7)}</p>
		{#if commit.message}
			<p class="mt-1 text-sm">{commit.message}</p>
		{/if}
		<p class="mt-1 text-xs text-muted-foreground">
			{format(commit.created_at * 1000, 'MMM d, HH:mm')}
		</p>
		{#if commit.files_changed}
			{@const files =
				typeof commit.files_changed === 'string'
					? JSON.parse(commit.files_changed)
					: commit.files_changed}
			{#if Array.isArray(files) && files.length}
				<p class="mt-2 text-xs text-muted-foreground">
					{files.length} file(s) changed
				</p>
			{/if}
		{/if}
	</Popover.Content>
</Popover.Root>
