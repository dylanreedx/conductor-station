<script lang="ts">
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Popover from '$lib/components/ui/popover';
	import * as Command from '$lib/components/ui/command';
	import { Brain, Search } from 'lucide-svelte';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import { tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { cn } from '$lib/utils';

	let { data } = $props();

	let projectId = $state('');
	let projectOpen = $state(false);
	let projectTriggerRef: HTMLButtonElement | null = $state(null);

	$effect(() => {
		projectId = data.filters.projectId ?? '';
	});

	const selectedProjectLabel = $derived(
		projectId
			? (data.projects.find((p) => p._id === projectId)?._displayName ?? 'All projects')
			: 'All projects'
	);

	function closeProjectAndFocusTrigger() {
		projectOpen = false;
		tick().then(() => projectTriggerRef?.focus());
	}

	const SNIPPET_LEN = 120;

	function snippet(text: string): string {
		if (!text) return '—';
		const t = text.trim();
		if (t.length <= SNIPPET_LEN) return t;
		return t.slice(0, SNIPPET_LEN).trim() + '…';
	}
</script>

<div class="space-y-6 p-6">
	<div>
		<h1 class="text-3xl font-bold">Memories</h1>
		<p class="text-muted-foreground">Search and browse Conductor memories</p>
	</div>

	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<Brain class="h-5 w-5" />
				Search
			</CardTitle>
			<CardDescription>Full-text search in name and content</CardDescription>
		</CardHeader>
		<CardContent>
			<form method="get" action="/memories" class="flex flex-wrap items-end gap-4">
				<input type="hidden" name="projectId" value={projectId} />
				<input type="hidden" name="limit" value={data.filters.limit} />
				<div class="flex min-w-[200px] flex-1 flex-col gap-1.5">
					<label for="q" class="text-xs font-medium text-muted-foreground">Query</label>
					<div class="relative">
						<Search
							class="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							id="q"
							name="q"
							type="search"
							value={data.filters.q}
							placeholder="Search name or content..."
							class="w-full pl-8"
						/>
					</div>
				</div>
				<div class="flex max-w-[220px] min-w-0 flex-col gap-1.5">
					<span class="text-xs font-medium text-muted-foreground">Project</span>
					<Popover.Root bind:open={projectOpen}>
						<Popover.Trigger bind:ref={projectTriggerRef}>
							{#snippet child({ props })}
								<Button
									{...props}
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
						<Popover.Content class="w-[220px] p-0" align="start">
							<Command.Root>
								<Command.Input placeholder="Search project..." />
								<Command.List>
									<Command.Empty>No project found.</Command.Empty>
									<Command.Group>
										<Command.Item
											value="all"
											onSelect={() => {
												projectId = '';
												closeProjectAndFocusTrigger();
											}}
										>
											<CheckIcon class={cn('size-4', projectId !== '' && 'text-transparent')} />
											All projects
										</Command.Item>
										{#each data.projects as p (p._id)}
											<Command.Item
												value={p._displayName}
												onSelect={() => {
													projectId = p._id;
													closeProjectAndFocusTrigger();
												}}
											>
												<CheckIcon
													class={cn('size-4', projectId !== p._id && 'text-transparent')}
												/>
												{p._displayName}
											</Command.Item>
										{/each}
									</Command.Group>
								</Command.List>
							</Command.Root>
						</Popover.Content>
					</Popover.Root>
				</div>
				<div class="flex w-full basis-full items-center justify-end gap-2 pt-1">
					<Button type="submit" size="sm">Search</Button>
					<Button type="button" variant="ghost" size="sm" onclick={() => goto('/memories')}>
						Clear
					</Button>
				</div>
			</form>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle>Results</CardTitle>
			<CardDescription>
				{data.memories.length}
				{data.memories.length === 1 ? 'memory' : 'memories'}
				{#if data.filters.q}
					(matching "{data.filters.q}")
				{/if}
			</CardDescription>
		</CardHeader>
		<CardContent>
			{#if data.memories.length > 0}
				<div class="space-y-4">
					{#each data.memories as memory}
						<div class="rounded-lg border bg-muted/30 p-4">
							<div class="flex flex-wrap items-center justify-between gap-2">
								<p class="font-medium">{memory.name}</p>
								<div class="flex items-center gap-2">
									<Badge variant="secondary">{memory._sourceAlias}</Badge>
									{#if memory._projectId}
										<span class="text-xs text-muted-foreground">project</span>
									{/if}
								</div>
							</div>
							<p class="mt-1 text-sm text-muted-foreground">
								{snippet(memory.content)}
							</p>
							{#if memory._parsedTags?.length > 0}
								<div class="mt-2 flex flex-wrap gap-1">
									{#each memory._parsedTags as tag}
										<Badge variant="outline" class="text-xs">{tag}</Badge>
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-sm text-muted-foreground">
					{#if data.filters.q}
						No memories found for "{data.filters.q}". Try a different query or clear filters.
					{:else}
						No memories found. Use search or adjust project filter.
					{/if}
				</p>
			{/if}
		</CardContent>
	</Card>
</div>
