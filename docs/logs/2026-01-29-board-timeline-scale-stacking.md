# Board Timeline: Scale, Positioning, and Stacking

**Date:** 2026-01-29 09:07:39 EST

## Summary

Implemented time-scaled X axis, session positioning by `started_at`/duration, and lane-based stacking so parallel and overlapping ("bleed") sessions are visible on the board view. Conductor MCP updated with new requirements via `save_memory` and `prepare_handoff`.

## Changes Made

### 1. Conductor MCP (Step 0)

- **save_memory:** Stored "Board timeline scale and stacking requirements" — X axis scales (days/hours), sessions positioned by time, stacking in lanes, parallel/bleed visibility as core primitive.
- **prepare_handoff:** Set current task to "Board timeline: scalable X axis, session positioning, stacking" with next steps.

### 2. TimelineBoard.svelte

- **Positioning:** Sessions sorted by `started_at` (chronological). For each session: `leftPx = (started_at - timeRange.start) / duration * railWidthPx`; `widthPx = max(MIN_SESSION_WIDTH_PX, duration_seconds * PIXELS_PER_SECOND)`. Active sessions use `now` for end time.
- **Lane assignment:** Classic interval scheduling — for each session (by started_at), assign smallest lane index where last session in that lane ends before this session starts. Overlapping sessions stack in different lanes.
- **Layout:** Replaced flex row with `position: absolute` container. Each SessionBlock wrapped in a div with `left`, `width`, `top` (laneIndex \* LANE_HEIGHT_PX). Rail and sessions strip share same width for scroll alignment.
- Constants: `PIXELS_PER_SECOND = 0.8`, `MIN_SESSION_WIDTH_PX = 140`, `LANE_HEIGHT_PX = 100`.

### 3. SessionBlock.svelte

- **Variable width:** New optional prop `widthPx`. When set (board view), block fills parent; compact layout for narrow widths: smaller icon, truncate header, hide Complete button and progress_notes when width < 200–220px.
- **Responsive:** Smaller gaps, tighter events area when in lane mode.

### 4. TimelineRail.svelte

- **Scale label:** Added range label above day bookmarks — "MMM d – MMM d" for multi-day, "HH:mm – HH:mm" for single-day. Gives immediate context for time window.

### 5. Documentation

- **HANDOFF.md:** Updated board section with time-scaled X axis, positioning, stacking, lanes, parallel/bleed visibility. Removed "Position session blocks by time" from Next Steps.

## Problem Addressed

- Board showed sessions in a single row (newest-first) with no temporal alignment. Overlapping sessions were indistinguishable from sequential ones.
- X axis labels scaled by duration but lacked explicit range context.
- Sessions did not reflect parallel work or bleed between sessions.

## Follow-up fixes (2026-01-29)

- **Axis direction:** Start (left) = most recent, end (right) = oldest. Added `inverted` prop to TimelineRail; scroll to start (0) shows newest.
- **Effective end for stale sessions:** Leading sessions (Conductor never called complete_session) were extending to "now", causing massive overlap. Now use `lastActivitySec` (completed_at ?? started_at) for \_displayStatus === 'completed' sessions. Board server and TimelineBoard both use effective end when computing timeRange and session duration.
- **Overlapping:** Correct end times prevent all sessions from extending to now; lane assignment now works as intended.

## Next Steps

- Optional: TanStack Query on board for client refetch on sync.
- Optional: Detail routes `/board/session/[id]`, `/features/[id]`.
- Optional: Scale toggle (Hours vs Days) if adaptive scale is insufficient.
