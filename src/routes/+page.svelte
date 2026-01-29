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
		Ban,
		ArrowRight
	} from 'lucide-svelte';
	import { PieChart } from 'layerchart';
	import { format } from 'date-fns';

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

	// Colors per status for the pie chart
	const statusChartColors: Record<string, string> = {
		passed: '#22c55e',
		pending: '#6b7280',
		in_progress: '#3b82f6',
		failed: '#ef4444',
		blocked: '#f97316'
	};

	// Display labels for statuses
	const statusLabels: Record<string, string> = {
		passed: 'Passed',
		pending: 'Pending',
		in_progress: 'In Progress',
		failed: 'Failed',
		blocked: 'Blocked'
	};

	// Chart data: features by status with colors for pie chart
	const pieChartData = $derived(
		Object.entries(data.stats.featuresByStatus ?? {}).map(([status, count]) => ({
			status,
			label: statusLabels[status] ?? status,
			value: count as number,
			color: statusChartColors[status] ?? '#6b7280'
		}))
	);

	// Total for center display
	const totalFeatures = $derived(pieChartData.reduce((sum, d) => sum + d.value, 0));

	function formatSessionTime(ts: number | null): string {
		if (ts == null) return '—';
		const ms = ts < 1e12 ? ts * 1000 : ts;
		return format(new Date(ms), 'MMM d, HH:mm');
	}

	function formatMemoryTime(ts: number): string {
		const ms = ts < 1e12 ? ts * 1000 : ts;
		return format(new Date(ms), 'MMM d');
	}

	function truncate(str: string, maxLen: number): string {
		if (str.length <= maxLen) return str;
		return str.slice(0, maxLen) + '…';
	}
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

	<!-- Features by status (pie chart) -->
	{#if pieChartData.length > 0}
		<Card>
			<CardHeader>
				<CardTitle class="text-base">Tasks by status</CardTitle>
				<CardDescription>Feature count per status across all projects</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="flex items-center justify-center">
					<div class="relative h-[250px] w-[250px]">
						<PieChart
							data={pieChartData}
							value="value"
							key="status"
							c="color"
							innerRadius={0.6}
							props={{
								tooltip: {
									root: {
										classes: {
											container:
												'border border-border/60 shadow-sm rounded-md bg-background/95 backdrop-blur-sm'
										}
									}
								}
							}}
						/>
						<!-- Center text -->
						<div
							class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
						>
							<span class="text-3xl font-bold">{totalFeatures}</span>
							<span class="text-sm text-muted-foreground">total</span>
						</div>
					</div>
				</div>
				<!-- Legend -->
				<div class="mt-4 flex flex-wrap justify-center gap-4">
					{#each pieChartData as item}
						<div class="flex items-center gap-2">
							<div class="h-3 w-3 rounded-sm" style="background-color: {item.color}"></div>
							<span class="text-sm text-muted-foreground">{item.label}</span>
							<span class="text-sm font-medium">{item.value}</span>
						</div>
					{/each}
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Recent sessions and Recent memories -->
	<div class="grid gap-4 md:grid-cols-2">
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Clock class="h-5 w-5" />
					Recent sessions
				</CardTitle>
				<CardDescription>Sessions across all Conductor databases</CardDescription>
			</CardHeader>
			<CardContent>
				{#if data.recentSessions?.length > 0}
					<div class="space-y-2">
						{#each data.recentSessions as session}
							<a
								href="/board?view=list"
								class="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 transition-colors hover:bg-muted/50"
							>
								<div class="min-w-0">
									<p class="truncate font-medium">
										Session {session.session_number} · {session._sourceAlias}
									</p>
									<p class="text-xs text-muted-foreground">
										{formatSessionTime(session.started_at)}
									</p>
								</div>
								<Badge variant="secondary" class="shrink-0 text-xs">
									{session.status}
								</Badge>
							</a>
						{/each}
					</div>
					<a
						href="/board?view=list"
						class="mt-2 flex items-center gap-1 text-sm text-muted-foreground hover:underline"
					>
						View all <ArrowRight class="h-4 w-4" />
					</a>
				{:else}
					<p class="text-sm text-muted-foreground">
						No sessions yet. Use Conductor MCP <code class="rounded bg-muted px-1"
							>start_session</code
						> in Cursor to create one.
					</p>
				{/if}
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Brain class="h-5 w-5" />
					Recent memories
				</CardTitle>
				<CardDescription>Stored patterns and insights</CardDescription>
			</CardHeader>
			<CardContent>
				{#if data.recentMemories?.length > 0}
					<div class="space-y-2">
						{#each data.recentMemories as memory}
							<a
								href="/memories"
								class="block rounded-md border bg-muted/30 px-3 py-2 transition-colors hover:bg-muted/50"
							>
								<p class="font-medium">{memory.name}</p>
								<p class="line-clamp-2 text-xs text-muted-foreground">
									{truncate(memory.content, 80)}
								</p>
								<p class="mt-1 text-xs text-muted-foreground">
									{formatMemoryTime(memory.created_at)} · {memory._sourceAlias}
								</p>
							</a>
						{/each}
					</div>
					<a
						href="/memories"
						class="mt-2 flex items-center gap-1 text-sm text-muted-foreground hover:underline"
					>
						View all <ArrowRight class="h-4 w-4" />
					</a>
				{:else}
					<p class="text-sm text-muted-foreground">
						No memories yet. Use Conductor MCP <code class="rounded bg-muted px-1">save_memory</code
						> in Cursor to add one.
					</p>
				{/if}
			</CardContent>
		</Card>
	</div>

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
