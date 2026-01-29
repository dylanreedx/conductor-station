# use-conductor

Use Conductor MCP for conductor-station: handoff, memories, tasks.

**Before starting work:** Call Conductor MCP `start_session` (projectName: "conductor-station", workspacePath) so the session is tracked.

**During/after work:** Use `save_memory` for patterns and decisions; use `get_feature_list` / `get_next_feature` to track tasks; use `complete_session` when wrapping up.

**To resume context:** Use `resume_from_handoff` (projectName: "conductor-station") and `get_memories` (projectName: "conductor-station") for the latest handoff and recent memories.
