<script lang="ts">
	import type { AggregatedProject } from '$lib/server/db/types';
	import { Button } from '$lib/components/ui/button';
	import * as Popover from '$lib/components/ui/popover';
	import * as Command from '$lib/components/ui/command';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import { tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { cn } from '$lib/utils';

	interface Props {
		projects: AggregatedProject[];
		currentProjectId: string;
		class?: string;
	}

	let { projects, currentProjectId, class: className = '' }: Props = $props();

	let projectOpen = $state(false);
	let projectTriggerRef: HTMLButtonElement | null = $state(null);

	const selectedProjectLabel = $derived(
		currentProjectId
			? (projects.find((p) => p._id === currentProjectId)?._displayName ?? 'One project')
			: 'All projects'
	);

	function closeAndFocus() {
		projectOpen = false;
		tick().then(() => projectTriggerRef?.focus());
	}

	function selectProject(id: string) {
		closeAndFocus();
		goto(id ? `/board?projectId=${encodeURIComponent(id)}` : '/board');
	}
</script>

<div class={cn('flex items-center gap-2', className)}>
	<span class="text-xs font-medium text-muted-foreground">View</span>
	<Popover.Root bind:open={projectOpen}>
		<Popover.Trigger bind:ref={projectTriggerRef}>
			{#snippet child({ props })}
				<Button
					{...props}
					type="button"
					variant="outline"
					size="sm"
					class="max-w-[220px] min-w-0 justify-between"
					role="combobox"
					aria-expanded={projectOpen}
				>
					<span class="truncate">{selectedProjectLabel}</span>
					<ChevronsUpDownIcon class="size-4 shrink-0 opacity-50" />
				</Button>
			{/snippet}
		</Popover.Trigger>
		<Popover.Content class="w-[220px] p-0" align="end">
			<Command.Root>
				<Command.Input placeholder="Search project..." />
				<Command.List>
					<Command.Empty>No project found.</Command.Empty>
					<Command.Group>
						<Command.Item value="all" onSelect={() => selectProject('')}>
							<CheckIcon class={cn('size-4', currentProjectId !== '' && 'text-transparent')} />
							All projects
						</Command.Item>
						{#each projects as p (p._id)}
							<Command.Item value={p._displayName} onSelect={() => selectProject(p._id)}>
								<CheckIcon class={cn('size-4', currentProjectId !== p._id && 'text-transparent')} />
								{p._displayName}
							</Command.Item>
						{/each}
					</Command.Group>
				</Command.List>
			</Command.Root>
		</Popover.Content>
	</Popover.Root>
</div>
