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
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import { FolderKanban } from 'lucide-svelte';

	let { data } = $props();

	function progressFor(project: (typeof data.projects)[number]) {
		const p = data.progressByProject[project._id];
		if (!p || p.total === 0) return null;
		return { passed: p.passed, total: p.total, pct: Math.round((p.passed / p.total) * 100) };
	}
</script>

<div class="space-y-6 p-6">
	<div>
		<h1 class="text-3xl font-bold">Projects</h1>
		<p class="text-muted-foreground">All Conductor projects across connected databases</p>
	</div>

	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<FolderKanban class="h-5 w-5" />
				Projects
			</CardTitle>
			<CardDescription>
				{data.projects.length}
				{data.projects.length === 1 ? 'project' : 'projects'} from connected databases
			</CardDescription>
		</CardHeader>
		<CardContent>
			{#if data.projects.length > 0}
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Type</TableHead>
							<TableHead>Source</TableHead>
							<TableHead>Progress</TableHead>
							<TableHead class="w-[100px]"></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#each data.projects as project}
							<TableRow>
								<TableCell>
									<div>
										<p class="font-medium">{project.name}</p>
										{#if project.workspace_path}
											<p class="max-w-md truncate text-xs text-muted-foreground">
												{project.workspace_path}
											</p>
										{/if}
									</div>
								</TableCell>
								<TableCell>
									<Badge variant="secondary">{project.project_type}</Badge>
								</TableCell>
								<TableCell>
									<span class="text-muted-foreground">{project._sourceAlias}</span>
								</TableCell>
								<TableCell>
									{@const prog = progressFor(project)}
									{#if prog}
										<div class="flex items-center gap-2">
											<div
												class="h-2 min-w-[60px] flex-1 rounded-full bg-muted"
												role="progressbar"
												aria-valuenow={prog.pct}
												aria-valuemin="0"
												aria-valuemax="100"
											>
												<div
													class="h-2 rounded-full bg-primary transition-all"
													style="width: {prog.pct}%"
												></div>
											</div>
											<span class="text-xs text-muted-foreground">{prog.passed}/{prog.total}</span>
										</div>
									{:else}
										<span class="text-xs text-muted-foreground">—</span>
									{/if}
								</TableCell>
								<TableCell>
									<a
										href="/features?projectId={encodeURIComponent(project._id)}"
										class="text-sm font-medium text-primary hover:underline"
									>
										View features
									</a>
								</TableCell>
							</TableRow>
						{/each}
					</TableBody>
				</Table>
			{:else}
				<p class="text-sm text-muted-foreground">No projects found. Add scan paths in Settings.</p>
			{/if}
		</CardContent>
	</Card>
</div>
