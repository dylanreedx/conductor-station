# Setup Wizard: Parent Directories + Realpath Dedupe

**Date:** 2026-01-28 23:43:12 EST  
**Status:** Completed

## Summary

Simplified the setup wizard so users can add one or more parent "working" directories for efficient recursive scan of all conductor.db files, keep single-path add as fallback, support multiple parent dirs (e.g. work + personal), and deduplicate results by realpath. No config schema change.

## Changes

### Discovery ([src/lib/server/db/discovery.ts](src/lib/server/db/discovery.ts))

- Imported `realpathSync` from `fs`.
- In `discoverDatabases`, after the DFS loop over `scanPaths`, added deduplication by realpath: for each found path, resolve with `realpathSync(p)`; keep first occurrence per resolved path; on error (e.g. broken symlink) keep original path. All callers (including `discoverDatabasesDetailed`) now receive deduped DB paths.

### Setup wizard ([src/routes/setup/+page.svelte](src/routes/setup/+page.svelte))

- Step 2 split into two sections: **Parent directories** (add multiple; we scan recursively inside each) and **Single project path** (add one at a time for projects outside parents or if scan missed). Both feed the same `paths` array (derived: `[...parentDirs, ...singlePaths]`) sent to scan/complete actions. Copy updated to explain parent dirs (e.g. ~/work, ~/personal) and single-path fallback.

### Settings ([src/routes/settings/+page.svelte](src/routes/settings/+page.svelte))

- CardDescription for Scan Paths: added one line: "Parent directories (we scan inside) and single project paths both go here."

### Docs

- [docs/HANDOFF.md](docs/HANDOFF.md): last updated and status line; Phase 1 setup-wizard bullet updated to mention parent dirs + single-path and realpath dedupe.

## Algorithm

- Core scan unchanged: one DFS per root, depth limit, exclude list (node_modules, .git, etc.). Time O(directories visited).
- New: after collecting all DB paths, dedupe by `realpathSync` so the same physical conductor.db appears once (handles overlapping roots or symlinks).

## Next Steps

- Optional: TanStack Query on board for client refetch; detail routes; position session blocks by time; invalidate query cache on Refresh/rescan.
