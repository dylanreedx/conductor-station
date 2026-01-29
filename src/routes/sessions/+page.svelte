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
	import { Clock, Loader2, CheckCircle2 } from 'lucide-svelte';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import { format, formatDistanceToNow } from 'date-fns';
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

	const statusOptions = [
		{ value: '', label: 'All' },
		{ value: 'pending', label: 'Pending' },
		{ value: 'active', label: 'Active' },
		{ value: 'completed', label: 'Completed' }
	] as const;

	const selectedProjectLabel = $derived(
		projectId
			? (data.projects.find((p) => p._id === projectId)?._displayName ?? 'All projects')
			: 'All projects'
	);

	function closeProjectAndFocusTrigger() {
		projectOpen = false;
		tick().then(() => projectTriggerRef?.focus());
	}

	function formatTs(ts: number | null): string {
		if (ts == null) return '—';
		try {
			return format(new Date(ts * 1000), 'MMM d, yyyy HH:mm');
		} catch {
			return '—';
		}
	}

	function relativeTs(ts: number | null): string {
		if (ts == null) return '';
		try {
			return formatDistanceToNow(new Date(ts * 1000), { addSuffix: true });
		} catch {
			return '';
		}
	}
</script>

<div class="space-y-6 p-6">
	<div>
		<h1 class="text-3xl font-bold">Sessions</h1>
		<p class="text-muted-foreground">Session timeline across Conductor projects</p>
	</div>

	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<Clock class="h-5 w-5" />
				Filters
			</CardTitle>
			<CardDescription>Filter by project or status</CardDescription>
		</CardHeader>
		<CardContent>
			<form method="get" action="/sessions" class="flex flex-wrap items-end gap-4">
				<input type="hidden" name="projectId" value={projectId} />
				<input type="hidden" name="status" value={status} />
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
				<div class="flex w-full basis-full items-center justify-end gap-2 pt-1">
					<Button type="submit" size="sm">Apply</Button>
					<Button type="button" variant="ghost" size="sm" onclick={() => goto('/sessions')}>
						Reset
					</Button>
				</div>
			</form>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle>Sessions</CardTitle>
			<CardDescription>
				{data.sessions.length}
				{data.sessions.length === 1 ? 'session' : 'sessions'}
			</CardDescription>
		</CardHeader>
		<CardContent>
			{#if data.sessions.length > 0}
				<div class="relative space-y-0">
					<!-- Timeline line -->
					<div class="absolute top-2 bottom-2 left-4 w-px bg-border" aria-hidden="true"></div>
					{#each data.sessions as session, i}
						<div class="relative flex gap-4 pb-8 last:pb-0">
							<div
								class="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-background"
								class:border-primary={session.status === 'active'}
								class:border-muted={session.status !== 'active'}
							>
								{#if session.status === 'active'}
									<Loader2 class="h-4 w-4 animate-spin text-primary" />
								{:else if session.status === 'completed'}
									<CheckCircle2 class="h-4 w-4 text-green-500" />
								{:else}
									<Clock class="h-4 w-4 text-muted-foreground" />
								{/if}
							</div>
							<div class="min-w-0 flex-1 rounded-lg border bg-muted/30 p-4">
								<div class="flex flex-wrap items-center justify-between gap-2">
									<div>
										<p class="font-medium">
											Session #{session.session_number}
											<span class="ml-2 text-muted-foreground">{session._sourceAlias}</span>
										</p>
										<p class="text-xs text-muted-foreground">
											{#if session.started_at}
												{formatTs(session.started_at)}
												{#if session.status === 'active'}
													<span class="ml-1">({relativeTs(session.started_at)})</span>
												{/if}
											{:else}
												Not started
											{/if}
										</p>
									</div>
									<Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
										{session.status}
									</Badge>
								</div>
								{#if session.progress_notes}
									<p class="mt-2 line-clamp-2 text-sm text-muted-foreground">
										{session.progress_notes}
									</p>
								{/if}
								{#if session.completed_at && session.status === 'completed'}
									<p class="mt-1 text-xs text-muted-foreground">
										Completed {formatTs(session.completed_at)}
									</p>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-sm text-muted-foreground">No sessions found. Adjust filters if needed.</p>
			{/if}
		</CardContent>
	</Card>
</div>
