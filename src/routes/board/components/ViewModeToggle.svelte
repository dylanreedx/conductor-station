<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import ListIcon from '@lucide/svelte/icons/list';
	import LayoutGridIcon from '@lucide/svelte/icons/layout-grid';
	import { goto } from '$app/navigation';
	import { cn } from '$lib/utils';

	interface Props {
		currentView: 'list' | 'board';
		projectId: string;
		class?: string;
	}

	let { currentView, projectId, class: className = '' }: Props = $props();

	function setView(view: 'list' | 'board') {
		const params = new URLSearchParams();
		if (projectId) params.set('projectId', projectId);
		params.set('view', view);
		goto(`/board?${params.toString()}`);
	}
</script>

<div
	class={cn('flex rounded-md border border-border p-0.5', className)}
	role="group"
	aria-label="View mode"
>
	<Button
		variant={currentView === 'list' ? 'secondary' : 'ghost'}
		size="sm"
		class="gap-1.5 rounded-sm"
		onclick={() => setView('list')}
		aria-pressed={currentView === 'list'}
	>
		<ListIcon class="h-4 w-4" />
		List
	</Button>
	<Button
		variant={currentView === 'board' ? 'secondary' : 'ghost'}
		size="sm"
		class="gap-1.5 rounded-sm"
		onclick={() => setView('board')}
		aria-pressed={currentView === 'board'}
	>
		<LayoutGridIcon class="h-4 w-4" />
		Board
	</Button>
</div>
