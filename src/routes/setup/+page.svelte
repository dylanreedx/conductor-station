<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
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
	import * as Dialog from '$lib/components/ui/dialog';
	import {
		Database,
		FolderSearch,
		Plus,
		Trash2,
		ArrowRight,
		CheckCircle2,
		Loader2,
		Folder,
		FolderOpen,
		ChevronLeft
	} from 'lucide-svelte';

	type Database = {
		path: string;
		alias: string;
		projectCount: number;
		isValid: boolean;
	};

	type DirEntry = { name: string; path: string };

	let step = $state<1 | 2 | 3>(1);
	let parentDirs = $state<string[]>([]);
	let singlePaths = $state<string[]>([]);
	let newParentPath = $state('');
	let newSinglePath = $state('');
	let databases = $state<Database[]>([]);
	let scanning = $state(false);
	let error = $state<string | null>(null);

	// Browse dialog
	let browseOpen = $state(false);
	let browseTarget = $state<'parent' | 'single'>('parent');
	let browsePath = $state('');
	let browseLoading = $state(false);
	let browseError = $state<string | null>(null);
	let browseRoots = $state<DirEntry[]>([]);
	let browseChildren = $state<DirEntry[]>([]);
	let browseCurrentPath = $state<string | null>(null);
	let browseParent = $state<string | null | 'roots'>(null);
	let browseFormEl = $state<HTMLFormElement | null>(null);

	// Merged for form submit (same scanPaths config)
	let paths = $derived([...parentDirs, ...singlePaths]);

	function addParentDir() {
		const trimmed = newParentPath.trim();
		if (trimmed && !parentDirs.includes(trimmed)) {
			parentDirs = [...parentDirs, trimmed];
			newParentPath = '';
		}
	}

	function removeParentDir(path: string) {
		parentDirs = parentDirs.filter((p) => p !== path);
	}

	function addSinglePath() {
		const trimmed = newSinglePath.trim();
		if (trimmed && !singlePaths.includes(trimmed)) {
			singlePaths = [...singlePaths, trimmed];
			newSinglePath = '';
		}
	}

	function removeSinglePath(path: string) {
		singlePaths = singlePaths.filter((p) => p !== path);
	}

	function handleParentKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			addParentDir();
		}
	}

	function handleSingleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			addSinglePath();
		}
	}

	function openBrowse(target: 'parent' | 'single') {
		browseTarget = target;
		browseOpen = true;
		browsePath = '';
		browseRoots = [];
		browseChildren = [];
		browseCurrentPath = null;
		browseParent = null;
		browseError = null;
		loadBrowse('');
	}

	async function loadBrowse(path: string) {
		browsePath = path;
		browseLoading = true;
		browseError = null;
		await tick();
		browseFormEl?.requestSubmit();
	}

	function handleBrowseResult(result: { type: string; data?: unknown }) {
		browseLoading = false;
		if (
			result.type === 'failure' &&
			result.data &&
			typeof result.data === 'object' &&
			'error' in result.data
		) {
			browseError = result.data.error as string;
			return;
		}
		browseError = null;
		const data = result.data as Record<string, unknown> | undefined;
		if (!data) return;
		if ('roots' in data && Array.isArray(data.roots)) {
			browseRoots = data.roots as DirEntry[];
			browseChildren = [];
			browseCurrentPath = null;
			browseParent = null;
		} else if ('children' in data && Array.isArray(data.children)) {
			browseChildren = data.children as DirEntry[];
			browseCurrentPath = (data.currentPath as string) ?? null;
			browseParent = (data.parent as string | null | 'roots') ?? null;
			browseRoots = [];
		}
	}

	function selectCurrentFolder() {
		const path = browseCurrentPath;
		if (!path) return;
		if (browseTarget === 'parent') {
			if (!parentDirs.includes(path)) parentDirs = [...parentDirs, path];
		} else {
			if (!singlePaths.includes(path)) singlePaths = [...singlePaths, path];
		}
		browseOpen = false;
	}

	function selectPath(path: string) {
		if (browseTarget === 'parent') {
			if (!parentDirs.includes(path)) parentDirs = [...parentDirs, path];
		} else {
			if (!singlePaths.includes(path)) singlePaths = [...singlePaths, path];
		}
		browseOpen = false;
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
			<!-- Step 2: Add Paths (parent dirs + single-path fallback) -->
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<FolderSearch class="h-5 w-5" />
					Add Scan Paths
				</CardTitle>
				<CardDescription>
					Add parent directories (e.g. ~/work, ~/personal) and we'll find all Conductor DBs inside.
					You can also add a single project path if it's outside these.
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-6">
				<!-- Parent directories -->
				<div class="space-y-2">
					<p class="text-sm font-medium">Parent directories</p>
					<p class="text-xs text-muted-foreground">
						We scan recursively inside each. Add multiple (e.g. work and personal).
					</p>
					<div class="flex gap-2">
						<Input
							type="text"
							placeholder="e.g. /Users/you/work or ~/personal"
							bind:value={newParentPath}
							onkeydown={handleParentKeydown}
							class="flex-1"
						/>
						<Button variant="outline" onclick={() => openBrowse('parent')} title="Browse">
							<FolderOpen class="h-4 w-4" />
						</Button>
						<Button variant="outline" onclick={addParentDir} disabled={!newParentPath.trim()}>
							<Plus class="h-4 w-4" />
						</Button>
					</div>
					{#if parentDirs.length > 0}
						<div class="space-y-1">
							{#each parentDirs as path}
								<div
									class="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2"
								>
									<code class="text-sm">{path}</code>
									<Button variant="ghost" size="sm" onclick={() => removeParentDir(path)}>
										<Trash2 class="h-4 w-4 text-destructive" />
									</Button>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<Separator />

				<!-- Single project path (fallback) -->
				<div class="space-y-2">
					<p class="text-sm font-medium">Single project path</p>
					<p class="text-xs text-muted-foreground">
						Add one directory at a time for projects outside the parents above or if the scan missed
						one.
					</p>
					<div class="flex gap-2">
						<Input
							type="text"
							placeholder="/path/to/single/project"
							bind:value={newSinglePath}
							onkeydown={handleSingleKeydown}
							class="flex-1"
						/>
						<Button variant="outline" onclick={() => openBrowse('single')} title="Browse">
							<FolderOpen class="h-4 w-4" />
						</Button>
						<Button variant="outline" onclick={addSinglePath} disabled={!newSinglePath.trim()}>
							<Plus class="h-4 w-4" />
						</Button>
					</div>
					{#if singlePaths.length > 0}
						<div class="space-y-1">
							{#each singlePaths as path}
								<div
									class="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2"
								>
									<code class="text-sm">{path}</code>
									<Button variant="ghost" size="sm" onclick={() => removeSinglePath(path)}>
										<Trash2 class="h-4 w-4 text-destructive" />
									</Button>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				{#if paths.length === 0}
					<div
						class="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground"
					>
						Add at least one path above (parent directory or single project).
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

	<!-- Browse directory picker -->
	<Dialog.Root bind:open={browseOpen}>
		<Dialog.Content class="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-md">
			<Dialog.Header>
				<Dialog.Title>Select directory</Dialog.Title>
				<Dialog.Description>
					{browseTarget === 'parent'
						? 'Choose a parent directory to scan'
						: 'Choose a single project path'}
				</Dialog.Description>
			</Dialog.Header>
			<form
				method="POST"
				action="?/browse"
				bind:this={browseFormEl}
				use:enhance={() => {
					return async ({ result }) => {
						handleBrowseResult(result);
					};
				}}
			>
				<input type="hidden" name="path" value={browsePath} />
			</form>
			{#if browseError}
				<p class="text-sm text-destructive">{browseError}</p>
			{/if}
			{#if browseLoading}
				<div class="flex items-center justify-center py-8">
					<Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			{:else}
				<div class="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
					{#if browseCurrentPath}
						<div class="flex shrink-0 items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
							<code class="min-w-0 flex-1 truncate text-sm">{browseCurrentPath}</code>
							<Button size="sm" class="shrink-0" onclick={selectCurrentFolder}
								>Select this folder</Button
							>
						</div>
						{#if browseParent !== null}
							<Button
								variant="ghost"
								size="sm"
								class="w-full justify-start"
								onclick={() => loadBrowse(browseParent === 'roots' ? '' : (browseParent ?? ''))}
							>
								<ChevronLeft class="mr-2 h-4 w-4" />
								Back
							</Button>
						{/if}
					{/if}
					<div class="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto rounded-md border">
						{#each browseRoots as entry}
							<div class="flex min-w-0 shrink-0 items-center gap-2 px-3 py-2 hover:bg-muted/50">
								<button
									type="button"
									class="flex min-w-0 flex-1 items-center gap-2 text-left"
									onclick={() => loadBrowse(entry.path)}
								>
									<Folder class="h-4 w-4 shrink-0 text-muted-foreground" />
									<span class="min-w-0 truncate">{entry.name}</span>
								</button>
								<Button
									size="sm"
									variant="ghost"
									class="shrink-0"
									onclick={() => selectPath(entry.path)}
								>
									Select
								</Button>
							</div>
						{/each}
						{#each browseChildren as entry}
							<div class="flex min-w-0 shrink-0 items-center gap-2 px-3 py-2 hover:bg-muted/50">
								<button
									type="button"
									class="flex min-w-0 flex-1 items-center gap-2 text-left"
									onclick={() => loadBrowse(entry.path)}
								>
									<Folder class="h-4 w-4 shrink-0 text-muted-foreground" />
									<span class="min-w-0 truncate">{entry.name}</span>
								</button>
								<Button
									size="sm"
									variant="ghost"
									class="shrink-0"
									onclick={() => selectPath(entry.path)}
								>
									Select
								</Button>
							</div>
						{/each}
					</div>
					{#if browseRoots.length === 0 && browseChildren.length === 0 && !browseLoading}
						<p class="py-4 text-center text-sm text-muted-foreground">No subdirectories</p>
					{/if}
				</div>
			{/if}
		</Dialog.Content>
	</Dialog.Root>
</div>
