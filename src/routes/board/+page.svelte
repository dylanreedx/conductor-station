<script lang="ts">
	import TimelineBoard from './components/TimelineBoard.svelte';
	import SessionListView from './components/SessionListView.svelte';
	import ViewSwitcher from './components/ViewSwitcher.svelte';
	import ViewModeToggle from './components/ViewModeToggle.svelte';
	import { cn } from '$lib/utils';

	let { data } = $props();

	const view = $derived((data.filters?.view as 'list' | 'board') ?? 'list');
</script>

<div class="space-y-6 p-6">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<div>
			<h1 class="text-3xl font-bold">Timeline Board</h1>
			<p class="text-muted-foreground">
				Chronological view of sessions, handoffs, features, and activity across Conductor projects
			</p>
		</div>
		<div class="flex shrink-0 flex-wrap items-center gap-3">
			<ViewModeToggle currentView={view} projectId={data.filters.projectId} />
			<ViewSwitcher projects={data.projects} currentProjectId={data.filters.projectId} />
		</div>
	</div>

	{#if view === 'list'}
		<SessionListView timelineData={data.timelineData} class={cn('min-h-[320px]')} />
	{:else}
		<TimelineBoard timelineData={data.timelineData} class={cn('min-h-[480px]')} />
	{/if}
</div>
