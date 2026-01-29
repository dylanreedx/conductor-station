<script lang="ts">
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Separator } from '$lib/components/ui/separator';
	import { Settings, Plus, Trash2, FolderSearch } from 'lucide-svelte';

	let { data } = $props();

	let newPath = $state('');
	let localPaths = $state<string[] | null>(null);
	let paths = $derived(localPaths ?? data.scanPaths);

	function addPath() {
		const p = newPath.trim();
		if (p && !paths.includes(p)) {
			localPaths = [...paths, p];
			newPath = '';
		}
	}

	function removePath(path: string) {
		localPaths = paths.filter((p) => p !== path);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			addPath();
		}
	}
</script>

<div class="space-y-6 p-6">
	<div>
		<h1 class="text-3xl font-bold">Settings</h1>
		<p class="text-muted-foreground">Manage scan paths and Conductor Station configuration</p>
	</div>

	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<FolderSearch class="h-5 w-5" />
				Scan Paths
			</CardTitle>
			<CardDescription>
				Directories to scan for <code class="rounded bg-muted px-1 py-0.5"
					>.conductor/conductor.db</code
				> files. Changes take effect after saving.
			</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<form method="post" action="?/save" class="space-y-4">
				<input type="hidden" name="paths" value={JSON.stringify(paths)} />
				<div class="flex gap-2">
					<Input
						type="text"
						placeholder="/path/to/your/projects"
						bind:value={newPath}
						onkeydown={handleKeydown}
						class="flex-1"
					/>
					<Button type="button" variant="outline" onclick={addPath} disabled={!newPath.trim()}>
						<Plus class="h-4 w-4" />
					</Button>
				</div>

				{#if paths.length > 0}
					<div class="space-y-2">
						<p class="text-sm font-medium text-muted-foreground">Current paths</p>
						{#each paths as path}
							<div
								class="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2"
							>
								<span class="max-w-md truncate font-mono text-sm">{path}</span>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onclick={() => removePath(path)}
									aria-label="Remove path"
								>
									<Trash2 class="h-4 w-4 text-muted-foreground" />
								</Button>
							</div>
						{/each}
					</div>
					<Button type="submit">Save and rescan</Button>
				{:else}
					<p class="text-sm text-muted-foreground">Add at least one path, then save.</p>
				{/if}
			</form>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<Settings class="h-5 w-5" />
				Configuration
			</CardTitle>
			<CardDescription>Current scan settings (read-only)</CardDescription>
		</CardHeader>
		<CardContent class="space-y-2 text-sm text-muted-foreground">
			<p>Scan depth: {data.scanDepth}</p>
			<p>Exclude patterns: {data.excludePatterns.join(', ')}</p>
		</CardContent>
	</Card>
</div>
