<script lang="ts">
	// This route redirects to /board?view=list in +page.server.ts.
	// This page is only shown briefly if redirect fails.
	let { data }: { data: unknown } = $props();
</script>

<div class="flex min-h-[200px] items-center justify-center p-6">
	<p class="text-sm text-muted-foreground">Redirecting to Board…</p>
</div>
