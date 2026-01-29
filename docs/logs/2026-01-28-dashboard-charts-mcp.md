# Dashboard charts + Conductor MCP integration

**Date/time:** 2026-01-28 23:39:47 EST

## Summary

Implemented minimal dashboard charts and lists, and wired the Conductor MCP workflow so sessions, tasks, and memories are tracked in Cursor and reflected on the dashboard.

## Changes

### 1. Conductor MCP workflow (Cursor-side)

- **`.cursor/commands/use-conductor.md`** — Updated with workflow: before work call `start_session`; during/after use `save_memory`, `get_feature_list` / `get_next_feature`, `complete_session`; to resume use `resume_from_handoff` and `get_memories` for conductor-station.

### 2. Dashboard data load

- **`src/routes/+page.server.ts`** — Added `recentSessions` = `conductorAPI.getSessions({ limit: 5 })` and `recentMemories` = `conductorAPI.getMemories({ limit: 5 })` to the page load. Stats and databases unchanged.

### 3. Dashboard UI

- **`src/routes/+page.svelte`** — Added:
  - **Tasks by status (chart)** — BarChart (LayerChart) using `stats.featuresByStatus`; shown only when there is feature data. Card with title “Tasks by status” and short description.
  - **Recent sessions** — Card listing up to 5 sessions (session number, source alias, started_at, status). Links to `/board?view=list`. Empty state: “No sessions yet. Use Conductor MCP start_session in Cursor to create one.”
  - **Recent memories** — Card listing up to 5 memories (name, truncated content, created_at, source). Links to `/memories`. Empty state: “No memories yet. Use Conductor MCP save_memory in Cursor to add one.”
- Helpers: `formatSessionTime`, `formatMemoryTime` (date-fns), `truncate` for memory content. Chart data derived from `stats.featuresByStatus` via `$derived`.

### 4. API

- **`src/lib/server/db/api.ts`** — No change. `getMemories` already uses `ORDER BY created_at DESC` and applies `filters.limit` in SQL.

### 5. Docs

- **`docs/HANDOFF.md`** — Added “Conductor MCP (Cursor workflow)” subsection: when to use start_session, save_memory, get_feature_list, complete_session, resume_from_handoff, get_memories; pointer to `.cursor/commands/use-conductor.md`.

## Problem / context

- Dashboard showed only aggregate stats (counts) and DB list; no charts or recent activity.
- No explicit instruction for using Conductor MCP so that Station’s data (sessions, memories) stays current.

## Fixes

- Dashboard now has one minimal chart (features by status) and two lists (recent sessions, recent memories) using existing API.
- Cursor command and HANDOFF describe the MCP workflow so agents and devs use start_session, save_memory, etc., and the dashboard reflects that data.

## Next steps

- Optional: TanStack Query on dashboard for refetch after sync.
- Optional: “Sessions over time” mini-chart (e.g. last 7 days completed) if desired; would need a small server helper that groups sessions by date.
