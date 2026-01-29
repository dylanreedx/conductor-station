<script lang="ts">
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import {
		FolderKanban,
		ListChecks,
		Clock,
		Brain,
		AlertTriangle,
		Database,
		CheckCircle2,
		XCircle,
		Loader2,
		Ban
	} from 'lucide-svelte';

	let { data } = $props();

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
</script>

<div class="space-y-6 p-6">
	<div>
		<h1 class="text-3xl font-bold">Dashboard</h1>
		<p class="text-muted-foreground">Overview of all your Conductor projects</p>
	</div>

	<!-- Stats Grid -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Projects</CardTitle>
				<FolderKanban class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{data.stats.totalProjects}</div>
				<p class="text-xs text-muted-foreground">
					Across {data.stats.databaseCount}
					{data.stats.databaseCount === 1 ? 'database' : 'databases'}
				</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Features</CardTitle>
				<ListChecks class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{data.stats.totalFeatures}</div>
				<div class="mt-1 flex gap-2">
					{#if data.stats.featuresByStatus.passed}
						<Badge variant="secondary" class="text-xs">
							<CheckCircle2 class="mr-1 h-3 w-3 text-green-500" />
							{data.stats.featuresByStatus.passed}
						</Badge>
					{/if}
					{#if data.stats.featuresByStatus.pending}
						<Badge variant="secondary" class="text-xs">
							<Loader2 class="mr-1 h-3 w-3 text-muted-foreground" />
							{data.stats.featuresByStatus.pending}
						</Badge>
					{/if}
					{#if data.stats.featuresByStatus.failed}
						<Badge variant="secondary" class="text-xs">
							<XCircle class="mr-1 h-3 w-3 text-red-500" />
							{data.stats.featuresByStatus.failed}
						</Badge>
					{/if}
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Sessions</CardTitle>
				<Clock class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{data.stats.totalSessions}</div>
				<p class="text-xs text-muted-foreground">
					{data.stats.activeSessions} active
				</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Memories</CardTitle>
				<Brain class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{data.stats.totalMemories}</div>
				<p class="text-xs text-muted-foreground">Stored across projects</p>
			</CardContent>
		</Card>
	</div>

	<!-- Quality Issues Alert -->
	{#if data.stats.unresolvedIssues > 0}
		<Card class="border-orange-500/50 bg-orange-500/5">
			<CardHeader class="flex flex-row items-center gap-2 pb-2">
				<AlertTriangle class="h-5 w-5 text-orange-500" />
				<CardTitle class="text-sm font-medium">Quality Issues</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="text-sm text-muted-foreground">
					You have <span class="font-medium text-orange-500">{data.stats.unresolvedIssues}</span>
					unresolved quality {data.stats.unresolvedIssues === 1 ? 'issue' : 'issues'} across your projects.
				</p>
			</CardContent>
		</Card>
	{/if}

	<!-- Connected Databases -->
	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<Database class="h-5 w-5" />
				Connected Databases
			</CardTitle>
			<CardDescription>Conductor databases discovered in your scan paths</CardDescription>
		</CardHeader>
		<CardContent>
			{#if data.databases.length > 0}
				<div class="space-y-2">
					{#each data.databases as db}
						<div class="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
							<div class="flex items-center gap-3">
								<Database class="h-4 w-4 text-muted-foreground" />
								<div>
									<p class="font-medium">{db.alias}</p>
									<p class="max-w-md truncate text-xs text-muted-foreground">{db.path}</p>
								</div>
							</div>
							<Badge variant="secondary"
								>{db.projectCount} {db.projectCount === 1 ? 'project' : 'projects'}</Badge
							>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-sm text-muted-foreground">No databases connected.</p>
			{/if}
		</CardContent>
	</Card>
</div>
