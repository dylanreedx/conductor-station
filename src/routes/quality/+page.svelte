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
	import * as Select from '$lib/components/ui/select';
	import * as Popover from '$lib/components/ui/popover';
	import * as Command from '$lib/components/ui/command';
	import { AlertTriangle, CheckCircle2 } from 'lucide-svelte';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import { tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { cn } from '$lib/utils';

	let { data } = $props();

	let projectId = $state('');
	let reflectionType = $state('');
	let projectOpen = $state(false);
	let projectTriggerRef: HTMLButtonElement | null = $state(null);

	$effect(() => {
		projectId = data.filters.projectId ?? '';
		reflectionType = data.filters.reflectionType ?? '';
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

	const reflectionTypeOptions = [
		{ value: '', label: 'All' },
		{ value: 'feature_complete', label: 'Feature complete' },
		{ value: 'session_complete', label: 'Session complete' },
		{ value: 'handoff', label: 'Handoff' }
	] as const;

	function parseJsonArray(val: string | null): string[] {
		if (!val) return [];
		try {
			const arr = JSON.parse(val);
			return Array.isArray(arr) ? arr : [];
		} catch {
			return [];
		}
	}
</script>

<div class="space-y-6 p-6">
	<div>
		<h1 class="text-3xl font-bold">Quality Issues</h1>
		<p class="text-muted-foreground">Quality reflections and known limitations</p>
	</div>

	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<AlertTriangle class="h-5 w-5" />
				Filters
			</CardTitle>
			<CardDescription>Filter by project, type, and include resolved</CardDescription>
		</CardHeader>
		<CardContent>
			<form method="get" action="/quality" class="flex flex-wrap items-end gap-4">
				<input type="hidden" name="projectId" value={projectId} />
				<input type="hidden" name="reflectionType" value={reflectionType} />
				<input type="hidden" name="limit" value={data.filters.limit} />
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
				<div class="flex flex-col gap-1.5">
					<span class="text-xs font-medium text-muted-foreground">Type</span>
					<Select.Root type="single" bind:value={reflectionType}>
						<Select.Trigger size="sm" class="w-[160px]">
							{reflectionTypeOptions.find((o) => o.value === reflectionType)?.label ?? 'All'}
						</Select.Trigger>
						<Select.Content>
							{#each reflectionTypeOptions as opt (opt.value)}
								<Select.Item value={opt.value} label={opt.label} />
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="flex items-center gap-2">
					<span class="text-sm text-muted-foreground">Include resolved:</span>
					<a
						href="/quality?includeResolved={data.filters.includeResolved ? '0' : '1'}{projectId
							? '&projectId=' + encodeURIComponent(projectId)
							: ''}{reflectionType ? '&reflectionType=' + encodeURIComponent(reflectionType) : ''}"
						class="text-sm font-medium text-primary hover:underline"
					>
						{data.filters.includeResolved ? 'Yes' : 'No'}
					</a>
				</div>
				<div class="flex w-full basis-full items-center justify-end gap-2 pt-1">
					<Button type="submit" size="sm">Apply</Button>
					<Button type="button" variant="ghost" size="sm" onclick={() => goto('/quality')}>
						Reset
					</Button>
				</div>
			</form>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle>Reflections</CardTitle>
			<CardDescription>
				{data.issues.length}
				{data.issues.length === 1 ? 'reflection' : 'reflections'}
				{#if !data.filters.includeResolved}
					(unresolved only)
				{/if}
			</CardDescription>
		</CardHeader>
		<CardContent>
			{#if data.issues.length > 0}
				<div class="space-y-4">
					{#each data.issues as issue}
						<div
							class="rounded-lg border p-4 {!issue.resolved
								? 'border-orange-500/50 bg-muted/30'
								: ''}"
						>
							<div class="flex flex-wrap items-center justify-between gap-2">
								<div class="flex items-center gap-2">
									<Badge variant={issue.resolved ? 'secondary' : 'destructive'}>
										{issue.reflection_type.replace('_', ' ')}
									</Badge>
									<Badge variant="outline">{issue._sourceAlias}</Badge>
									{#if issue.resolved}
										<CheckCircle2 class="h-4 w-4 text-green-500" />
									{/if}
								</div>
							</div>
							{#if issue.shortcuts_taken}
								{@const shortcuts = parseJsonArray(issue.shortcuts_taken)}
								{#if shortcuts.length > 0}
									<p class="mt-2 text-sm">
										<span class="font-medium text-muted-foreground">Shortcuts:</span>
										{shortcuts.join(', ')}
									</p>
								{/if}
							{/if}
							{#if issue.tests_skipped}
								{@const skipped = parseJsonArray(issue.tests_skipped)}
								{#if skipped.length > 0}
									<p class="mt-1 text-sm">
										<span class="font-medium text-muted-foreground">Tests skipped:</span>
										{skipped.join(', ')}
									</p>
								{/if}
							{/if}
							{#if issue.known_limitations}
								{@const limits = parseJsonArray(issue.known_limitations)}
								{#if limits.length > 0}
									<p class="mt-1 text-sm">
										<span class="font-medium text-muted-foreground">Known limitations:</span>
										{limits.join(', ')}
									</p>
								{/if}
							{/if}
							{#if issue.deferred_work}
								{@const deferred = parseJsonArray(issue.deferred_work)}
								{#if deferred.length > 0}
									<p class="mt-1 text-sm">
										<span class="font-medium text-muted-foreground">Deferred:</span>
										{deferred.join(', ')}
									</p>
								{/if}
							{/if}
							{#if issue.resolved_notes}
								<p class="mt-2 text-xs text-muted-foreground">
									Resolved: {issue.resolved_notes}
								</p>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-sm text-muted-foreground">
					{#if !data.filters.includeResolved}
						No unresolved quality issues. Toggle "Include resolved" to see all.
					{:else}
						No quality reflections found.
					{/if}
				</p>
			{/if}
		</CardContent>
	</Card>
</div>
