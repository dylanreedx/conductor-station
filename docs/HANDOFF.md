# Conductor Station — Handoff / Context

**Last updated:** 2026-01-28  
**Status:** Phase 1 + Phase 2 complete. Completion rules and timeline UX in place. Ready for Phase 3 or maintenance.

---

## What This Project Is

**Conductor Station** is a SvelteKit app that aggregates multiple **Conductor** databases (`.conductor/conductor.db` files) into a single read-only dashboard. It discovers DBs by scanning configured directories, caches query results, polls for file changes, and exposes a unified API. No writes to external Conductor DBs.

- **Stack:** SvelteKit, Svelte 5, TypeScript, Tailwind v4, shadcn-svelte, TanStack Query, date-fns, Drizzle (schema only; DB access via better-sqlite3 read-only).
- **Config:** `conductor-station.config.json` (gitignored), created via first-run setup wizard. Contains `scanPaths`, `scanDepth`, `excludePatterns`, `sync`, `theme`.

---

## Architecture (Phase 1)

```
Unified API (api.ts) → conductorAPI singleton
    ↓
Cache (cache.ts) — TTL 30s, source-based invalidation
    ↓
Sync (sync.ts) — mtime polling (2min default / 5s live)
    ↓
Connection pool (connection.ts) — read-only SQLite, alias per DB
    ↓
Discovery (discovery.ts) — recursive .conductor/conductor.db scan, schema validation
```

- **Composite IDs:** `alias:uuid` (e.g. `selectus:abc-123`) for cross-DB uniqueness.
- **Types:** `src/lib/server/db/types.ts` — base types (Project, Session, Feature, Memory, Handoff, Commit, FeatureError, QualityReflection), aggregated types with `_id`, `_sourceDb`, `_sourceAlias`, optional `_displayStatus`, filter types, DashboardStats, SyncState, Config.
- **Effective status (display-only):** `src/lib/server/db/effectiveStatus.ts` — session treated as **completed** if last activity &gt; 2 days; project treated as **completed** if last activity &gt; 1 week. Used for dashboard stats (active count) and board/timeline UI only; no writes to Conductor DBs.

---

## Phase 1 Delivered

- Sync engine, cache, connection pool, discovery, unified API.
- Setup wizard (welcome → add paths → scan preview → create config).
- App shell: sidebar nav, live mode toggle, refresh, DB count.
- Dashboard (`/`): stats (projects, features, sessions, memories), quality alert, connected DBs list.
- API routes: `/api/sync/state`, `/api/sync/live`, `/api/sync/refresh`.

Log: [docs/logs/2026-01-28-phase1-foundation.md](logs/2026-01-28-phase1-foundation.md)

---

## Phase 2 Delivered

1. **TanStack Query** — `QueryClient` + `QueryClientProvider` in root layout (`enabled: browser`). Query key factory: `src/lib/query/keys.ts` (projects, features, sessions, memories, quality, config, etc.). Server loaders remain source of truth; pages can use `createQuery` with `initialData` when desired.

2. **Projects** (`/projects`) — List with name, type, source, progress bar (X/Y features), link to `/features?projectId=...`. Data: `getProjects()`, `getFeatures(limit: 5000)` → `progressByProject`.

3. **Features** (`/features`) — Filters (project, status, phase, category, search) and pagination via URL. Table: description, status, phase, category, project/source, priority. Data: `getFeatures(filters)`, `getProjects()`.

4. **Sessions** (`/sessions`) — Redirects to `/board?view=list`. Board/timeline: sessions sorted **newest first**; list and board views; effective status (stale sessions shown as completed after 2 days).

5. **Memories** (`/memories`) — Search input + project filter. If `q`/`query` param: `searchMemories(query, limit)`; else `getMemories(filters)`. Results: name, snippet, tags, source.

6. **Quality** (`/quality`) — Filters (project, reflection type). “Include resolved” link toggle. List of reflections: type, source, shortcuts_taken, tests_skipped, known_limitations, deferred_work, resolved_notes.

7. **Settings** (`/settings`) — Current scan paths; add/remove paths; “Save and rescan” → `updateScanPaths()`, `conductorAPI.rescan(config)`, redirect. Read-only: scan depth, exclude patterns.

Log: [docs/logs/2026-01-28-phase2-feature-pages.md](logs/2026-01-28-phase2-feature-pages.md)

---

## Key Files

| Area                         | Path                                                                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API                          | `src/lib/server/db/api.ts`                                                                                                                                    |
| Types                        | `src/lib/server/db/types.ts`                                                                                                                                  |
| Config                       | `src/lib/server/config.ts`                                                                                                                                    |
| Query keys                   | `src/lib/query/keys.ts`                                                                                                                                       |
| Layout (shell + QueryClient) | `src/routes/+layout.svelte`                                                                                                                                   |
| Dashboard                    | `src/routes/+page.svelte`                                                                                                                                     |
| Projects                     | `src/routes/projects/+page.server.ts`, `+page.svelte`                                                                                                         |
| Features                     | `src/routes/features/+page.server.ts`, `+page.svelte`                                                                                                         |
| Sessions                     | `src/routes/sessions/+page.server.ts`, `+page.svelte`                                                                                                         |
| Memories                     | `src/routes/memories/+page.server.ts`, `+page.svelte`                                                                                                         |
| Quality                      | `src/routes/quality/+page.server.ts`, `+page.svelte`                                                                                                          |
| Settings                     | `src/routes/settings/+page.server.ts`, `+page.svelte`                                                                                                         |
| Setup wizard                 | `src/routes/setup/+page.server.ts`, `+page.svelte`                                                                                                            |
| Effective status             | `src/lib/server/db/effectiveStatus.ts`                                                                                                                        |
| Board / timeline             | `src/routes/board/+page.server.ts`, `+page.svelte`, `components/TimelineBoard.svelte`, `SessionListView.svelte`, `TimelineRail.svelte`, `SessionBlock.svelte` |

---

## Timeline Board (Board view)

- **List view** — Vertical timeline, newest session at top; expandable rows; session card max height and scrollable events; expanded events area max-height 280px.
- **Board view** — Horizontal scroll; sessions newest-first; scroll to start on load; scroll container padding; session cards max-height 320px with scrollable events; **day bookmarks** on the rail (e.g. “Mon 27”, “Tue 28”) — click to scroll to that day.

---

## Conventions

- No migrations/start scripts run by the agent; no `npm run dev`/start.
- Prefer editing existing logic over new duplicate implementations.
- Log meaningful changes in `docs/logs/` with date, summary, and next steps.
- Use TODO tool for multi-step work.

---

## Next Steps (Optional)

- Use TanStack Query on board page for client refetch on sync.
- Detail routes: `/board/session/[id]`, `/projects/[id]`, `/features/[id]` when needed.
- Invalidate TanStack Query cache on “Refresh” or after rescan.
- Position session blocks by time on board view (align with rail).
