<script lang="ts">
	import './layout.css';
	import { browser } from '$app/environment';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { Button } from '$lib/components/ui/button';
	import { Switch } from '$lib/components/ui/switch';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import {
		LayoutDashboard,
		FolderKanban,
		ListChecks,
		Clock,
		Brain,
		AlertTriangle,
		Settings,
		Database,
		Zap,
		RefreshCw
	} from 'lucide-svelte';

	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				enabled: browser
			}
		}
	});

	let { data, children } = $props();

	let isLiveMode = $state(false);
	let isRefreshing = $state(false);

	// Sync isLiveMode with data
	$effect(() => {
		isLiveMode = data.syncState?.isLiveMode ?? false;
	});

	const navItems = [
		{ href: '/', label: 'Dashboard', icon: LayoutDashboard },
		{ href: '/projects', label: 'Projects', icon: FolderKanban },
		{ href: '/features', label: 'Features', icon: ListChecks },
		{ href: '/sessions', label: 'Sessions', icon: Clock },
		{ href: '/memories', label: 'Memories', icon: Brain },
		{ href: '/quality', label: 'Quality', icon: AlertTriangle }
	];

	async function toggleLiveMode() {
		isLiveMode = !isLiveMode;
		await fetch('/api/sync/live', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ enabled: isLiveMode })
		});
	}

	async function forceRefresh() {
		isRefreshing = true;
		await fetch('/api/sync/refresh', { method: 'POST' });
		// Reload the page to get fresh data
		window.location.reload();
	}

	function isActive(href: string): boolean {
		if (href === '/') {
			return $page.url.pathname === '/';
		}
		return $page.url.pathname.startsWith(href);
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<QueryClientProvider client={queryClient}>
	{#if !data.hasConfig}
		<!-- Setup wizard - no sidebar -->
		{@render children()}
	{:else}
		<!-- Main app with sidebar -->
		<div class="flex h-screen bg-background">
			<!-- Sidebar -->
			<aside class="flex w-64 flex-col border-r bg-muted/30">
				<!-- Logo -->
				<div class="flex h-14 items-center gap-2 border-b px-4">
					<Database class="h-6 w-6 text-primary" />
					<span class="font-semibold">Conductor Station</span>
				</div>

				<!-- Navigation -->
				<nav class="flex-1 space-y-1 p-2">
					{#each navItems as item}
						<a
							href={item.href}
							class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors {isActive(
								item.href
							)
								? 'bg-primary text-primary-foreground'
								: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
						>
							<item.icon class="h-4 w-4" />
							{item.label}
						</a>
					{/each}
				</nav>

				<Separator />

				<!-- Settings link -->
				<div class="p-2">
					<a
						href="/settings"
						class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors {isActive(
							'/settings'
						)
							? 'bg-primary text-primary-foreground'
							: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
					>
						<Settings class="h-4 w-4" />
						Settings
					</a>
				</div>

				<!-- Sync status -->
				<div class="border-t p-4">
					<div class="space-y-3">
						<!-- Database count -->
						<div class="flex items-center justify-between text-sm">
							<span class="text-muted-foreground">Databases</span>
							<Badge variant="secondary">{data.syncState?.databases.length ?? 0}</Badge>
						</div>

						<!-- Live mode toggle -->
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2 text-sm">
								<Zap class="h-4 w-4 {isLiveMode ? 'text-yellow-500' : 'text-muted-foreground'}" />
								<span class="text-muted-foreground">Live Mode</span>
							</div>
							<Switch checked={isLiveMode} onCheckedChange={toggleLiveMode} />
						</div>

						<!-- Refresh button -->
						<Button
							variant="outline"
							size="sm"
							class="w-full"
							onclick={forceRefresh}
							disabled={isRefreshing}
						>
							<RefreshCw class="mr-2 h-4 w-4 {isRefreshing ? 'animate-spin' : ''}" />
							{isRefreshing ? 'Refreshing...' : 'Refresh'}
						</Button>
					</div>
				</div>
			</aside>

			<!-- Main content -->
			<main class="flex-1 overflow-auto">
				{@render children()}
			</main>
		</div>
	{/if}
</QueryClientProvider>
