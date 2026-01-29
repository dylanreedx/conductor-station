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
	import * as Select from '$lib/components/ui/select';
	import * as Popover from '$lib/components/ui/popover';
	import * as Command from '$lib/components/ui/command';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import { ListChecks, CheckCircle2, XCircle, Loader2, Ban, Search } from 'lucide-svelte';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import { tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { cn } from '$lib/utils';

	let { data } = $props();

	let projectId = $state('');
	let status = $state('');
	let projectOpen = $state(false);
	let projectTriggerRef: HTMLButtonElement | null = $state(null);

	$effect(() => {
		projectId = data.filters.projectId ?? '';
		status = data.filters.status ?? '';
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

	const statusOptions = [
		{ value: '', label: 'All' },
		{ value: 'pending', label: 'Pending' },
		{ value: 'in_progress', label: 'In progress' },
		{ value: 'passed', label: 'Passed' },
		{ value: 'failed', label: 'Failed' },
		{ value: 'blocked', label: 'Blocked' }
	] as const;

	const statusIcons = {
		passed: CheckCircle2,
		failed: XCircle,
		pending: Loader2,
		in_progress: Loader2,
		blocked: Ban
	};

	const statusColors = {
		passed: 'text-green-500',
		failed: 'text-red-500',
		pending: 'text-muted-foreground',
		in_progress: 'text-blue-500',
		blocked: 'text-orange-500'
	};

	function buildQuery(overrides: Record<string, string | number>) {
		const params = new URLSearchParams();
		if (data.filters.projectId) params.set('projectId', data.filters.projectId);
		if (data.filters.sourceAlias) params.set('sourceAlias', data.filters.sourceAlias);
		if (data.filters.status) params.set('status', data.filters.status);
		if (data.filters.phase) params.set('phase', data.filters.phase);
		if (data.filters.category) params.set('category', data.filters.category);
		if (data.filters.search) params.set('search', data.filters.search);
		params.set('limit', String(data.filters.limit));
		params.set('offset', String(data.filters.offset));
		for (const [k, v] of Object.entries(overrides)) {
			if (v !== '' && v !== undefined) params.set(k, String(v));
			else params.delete(k);
		}
		return '/features?' + params.toString();
	}
</script>

<div class="space-y-6 p-6">
	<div>
		<h1 class="text-3xl font-bold">Features</h1>
		<p class="text-muted-foreground">Browse and filter features across projects</p>
	</div>

	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<ListChecks class="h-5 w-5" />
				Filters
			</CardTitle>
			<CardDescription>Filter by project, status, phase, category, or search</CardDescription>
		</CardHeader>
		<CardContent>
			<form method="get" action="/features" class="flex flex-wrap items-end gap-4">
				<input type="hidden" name="projectId" value={projectId} />
				<input type="hidden" name="status" value={status} />
				<input type="hidden" name="limit" value={data.filters.limit} />
				<input type="hidden" name="offset" value="0" />
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
					<span class="text-xs font-medium text-muted-foreground">Status</span>
					<Select.Root type="single" bind:value={status}>
						<Select.Trigger size="sm" class="w-[140px]">
							{statusOptions.find((o) => o.value === status)?.label ?? 'All'}
						</Select.Trigger>
						<Select.Content>
							{#each statusOptions as opt (opt.value)}
								<Select.Item value={opt.value} label={opt.label} />
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="flex flex-col gap-1.5">
					<label for="phase" class="text-xs font-medium text-muted-foreground">Phase</label>
					<input
						id="phase"
						name="phase"
						type="number"
						min="0"
						value={data.filters.phase}
						placeholder="Any"
						class="h-9 w-20 rounded-md border border-input bg-transparent px-3 text-sm"
					/>
				</div>
				<div class="flex flex-col gap-1.5">
					<label for="category" class="text-xs font-medium text-muted-foreground">Category</label>
					<input
						id="category"
						name="category"
						type="text"
						value={data.filters.category}
						placeholder="Any"
						class="h-9 w-32 rounded-md border border-input bg-transparent px-3 text-sm"
					/>
				</div>
				<div class="flex flex-col gap-1.5">
					<label for="search" class="text-xs font-medium text-muted-foreground">Search</label>
					<div class="relative">
						<Search
							class="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							id="search"
							name="search"
							type="search"
							value={data.filters.search}
							placeholder="Description..."
							class="h-9 w-48 pl-8"
						/>
					</div>
				</div>
				<div class="flex w-full basis-full items-center justify-end gap-2 pt-1">
					<Button type="submit" size="sm">Apply</Button>
					<Button type="button" variant="ghost" size="sm" onclick={() => goto('/features')}>
						Reset
					</Button>
				</div>
			</form>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle>Features</CardTitle>
			<CardDescription>
				{data.features.length}
				{data.features.length === 1 ? 'feature' : 'features'}
				{#if data.filters.search || data.filters.status || data.filters.projectId}
					(matching filters)
				{/if}
			</CardDescription>
		</CardHeader>
		<CardContent>
			{#if data.features.length > 0}
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Description</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Phase</TableHead>
							<TableHead>Category</TableHead>
							<TableHead>Project / Source</TableHead>
							<TableHead>Priority</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#each data.features as feature}
							<TableRow>
								<TableCell>
									<p class="max-w-md truncate font-medium" title={feature.description}>
										{feature.description}
									</p>
								</TableCell>
								<TableCell>
									{@const Icon = statusIcons[feature.status]}
									<Badge variant="secondary" class="gap-1">
										<Icon class="h-3 w-3 {statusColors[feature.status]}" />
										{feature.status}
									</Badge>
								</TableCell>
								<TableCell>{feature.phase}</TableCell>
								<TableCell>
									<Badge variant="outline">{feature.category}</Badge>
								</TableCell>
								<TableCell>
									<span class="text-muted-foreground">{feature._sourceAlias}</span>
								</TableCell>
								<TableCell>{feature.priority}</TableCell>
							</TableRow>
						{/each}
					</TableBody>
				</Table>
				{#if data.filters.limit != null && data.features.length >= data.filters.limit}
					<div class="mt-4 flex gap-2">
						{#if (data.filters.offset ?? 0) > 0}
							<a
								href={buildQuery({
									offset: Math.max(0, (data.filters.offset ?? 0) - (data.filters.limit ?? 100))
								})}
								class="text-sm text-primary hover:underline"
							>
								Previous
							</a>
						{/if}
						<a
							href={buildQuery({
								offset: (data.filters.offset ?? 0) + (data.filters.limit ?? 100)
							})}
							class="text-sm text-primary hover:underline"
						>
							Next
						</a>
					</div>
				{/if}
			{:else}
				<p class="text-sm text-muted-foreground">
					No features found. Adjust filters or add more projects.
				</p>
			{/if}
		</CardContent>
	</Card>
</div>
