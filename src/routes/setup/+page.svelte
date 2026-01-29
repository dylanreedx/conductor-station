<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import {
		Database,
		FolderSearch,
		Plus,
		Trash2,
		ArrowRight,
		CheckCircle2,
		Loader2
	} from 'lucide-svelte';

	type Database = {
		path: string;
		alias: string;
		projectCount: number;
		isValid: boolean;
	};

	let step = $state<1 | 2 | 3>(1);
	let paths = $state<string[]>([]);
	let newPath = $state('');
	let databases = $state<Database[]>([]);
	let scanning = $state(false);
	let error = $state<string | null>(null);

	function addPath() {
		if (newPath.trim() && !paths.includes(newPath.trim())) {
			paths = [...paths, newPath.trim()];
			newPath = '';
		}
	}

	function removePath(path: string) {
		paths = paths.filter((p) => p !== path);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			addPath();
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-background p-4">
	<Card class="w-full max-w-2xl">
		{#if step === 1}
			<!-- Step 1: Welcome -->
			<CardHeader class="text-center">
				<div
					class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10"
				>
					<Database class="h-8 w-8 text-primary" />
				</div>
				<CardTitle class="text-2xl">Welcome to Conductor Station</CardTitle>
				<CardDescription class="text-base">
					Aggregate and visualize all your Conductor databases in one place
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-6">
				<div class="space-y-4 text-sm text-muted-foreground">
					<p>
						Conductor Station scans your directories for <code class="rounded bg-muted px-1 py-0.5"
							>.conductor/conductor.db</code
						> files and provides a unified dashboard to track progress across all your projects.
					</p>
					<ul class="list-inside list-disc space-y-1">
						<li>View all projects, features, and sessions in one place</li>
						<li>Search memories across all databases</li>
						<li>Track quality issues and technical debt</li>
						<li>Real-time sync with live mode</li>
					</ul>
				</div>
				<Separator />
				<Button class="w-full" onclick={() => (step = 2)}>
					Get Started
					<ArrowRight class="ml-2 h-4 w-4" />
				</Button>
			</CardContent>
		{:else if step === 2}
			<!-- Step 2: Add Paths -->
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<FolderSearch class="h-5 w-5" />
					Add Scan Paths
				</CardTitle>
				<CardDescription>
					Add directories to scan for Conductor databases. You can add multiple paths.
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="flex gap-2">
					<Input
						type="text"
						placeholder="/path/to/your/projects"
						bind:value={newPath}
						onkeydown={handleKeydown}
						class="flex-1"
					/>
					<Button variant="outline" onclick={addPath} disabled={!newPath.trim()}>
						<Plus class="h-4 w-4" />
					</Button>
				</div>

				{#if paths.length > 0}
					<div class="space-y-2">
						{#each paths as path}
							<div
								class="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2"
							>
								<code class="text-sm">{path}</code>
								<Button variant="ghost" size="sm" onclick={() => removePath(path)}>
									<Trash2 class="h-4 w-4 text-destructive" />
								</Button>
							</div>
						{/each}
					</div>
				{:else}
					<div
						class="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground"
					>
						No paths added yet. Add a directory path above.
					</div>
				{/if}

				{#if error}
					<p class="text-sm text-destructive">{error}</p>
				{/if}

				<Separator />

				<div class="flex gap-2">
					<Button variant="outline" onclick={() => (step = 1)}>Back</Button>
					<form
						method="POST"
						action="?/scan"
						class="flex-1"
						use:enhance={() => {
							scanning = true;
							error = null;
							return async ({ result }) => {
								scanning = false;
								if (result.type === 'success' && result.data) {
									databases = result.data.databases as Database[];
									step = 3;
								} else if (result.type === 'failure') {
									error = (result.data?.error as string) || 'Scan failed';
								}
							};
						}}
					>
						<input type="hidden" name="paths" value={paths.join('\n')} />
						<Button type="submit" class="w-full" disabled={paths.length === 0 || scanning}>
							{#if scanning}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								Scanning...
							{:else}
								Scan for Databases
								<ArrowRight class="ml-2 h-4 w-4" />
							{/if}
						</Button>
					</form>
				</div>
			</CardContent>
		{:else if step === 3}
			<!-- Step 3: Confirm -->
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<CheckCircle2 class="h-5 w-5 text-green-500" />
					Databases Found
				</CardTitle>
				<CardDescription>
					Found {databases.length} Conductor {databases.length === 1 ? 'database' : 'databases'}
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				{#if databases.length > 0}
					<div class="space-y-2">
						{#each databases as db}
							<div
								class="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2"
							>
								<div class="flex items-center gap-2">
									<Database class="h-4 w-4 text-muted-foreground" />
									<div>
										<p class="font-medium">{db.alias}</p>
										<p class="text-xs text-muted-foreground">{db.path}</p>
									</div>
								</div>
								<Badge variant="secondary"
									>{db.projectCount} {db.projectCount === 1 ? 'project' : 'projects'}</Badge
								>
							</div>
						{/each}
					</div>
				{:else}
					<div class="rounded-md border border-dashed p-6 text-center">
						<p class="text-sm text-muted-foreground">
							No Conductor databases found in the specified paths.
						</p>
						<p class="mt-1 text-xs text-muted-foreground">
							Make sure you have projects with <code>.conductor/conductor.db</code> files.
						</p>
					</div>
				{/if}

				<Separator />

				<div class="flex gap-2">
					<Button variant="outline" onclick={() => (step = 2)}>Back</Button>
					<form method="POST" action="?/complete" class="flex-1" use:enhance>
						<input type="hidden" name="paths" value={paths.join('\n')} />
						<Button type="submit" class="w-full">
							{databases.length > 0 ? 'Complete Setup' : 'Continue Anyway'}
							<ArrowRight class="ml-2 h-4 w-4" />
						</Button>
					</form>
				</div>
			</CardContent>
		{/if}
	</Card>
</div>
