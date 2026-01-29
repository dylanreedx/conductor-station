#!/bin/bash
# Import script to copy conductor-station project data from /Users/dylan/Documents/work/.conductor/conductor.db
# into the local conductor-station database (only imports conductor-station project, filters out others)

SOURCE_DB="/Users/dylan/Documents/work/.conductor/conductor.db"
TARGET_DB="$(cd "$(dirname "$0")/.." && pwd)/.conductor/conductor.db"

if [ ! -f "$SOURCE_DB" ]; then
    echo "Error: Source database not found at $SOURCE_DB"
    exit 1
fi

if [ ! -f "$TARGET_DB" ]; then
    echo "Error: Target database not found at $TARGET_DB"
    exit 1
fi

echo "Importing data from: $SOURCE_DB"
echo "Into database: $TARGET_DB"
echo ""

# Use ATTACH DATABASE for reliable copying
sqlite3 "$TARGET_DB" <<EOF
ATTACH DATABASE '$SOURCE_DB' AS source_db;

-- Clear existing data
DELETE FROM quality_reflections;
DELETE FROM feature_errors;
DELETE FROM commits;
DELETE FROM handoffs;
DELETE FROM memories;
DELETE FROM archived_features;
DELETE FROM features;
DELETE FROM sessions;
DELETE FROM projects;

-- Only import conductor-station project data
BEGIN TRANSACTION;

-- Get conductor-station project ID from source
-- Import only conductor-station project and its related data
INSERT OR REPLACE INTO projects SELECT * FROM source_db.projects WHERE name = 'conductor-station';

INSERT OR REPLACE INTO sessions SELECT * FROM source_db.sessions 
WHERE project_id IN (SELECT id FROM source_db.projects WHERE name = 'conductor-station');

INSERT OR REPLACE INTO features SELECT * FROM source_db.features 
WHERE project_id IN (SELECT id FROM source_db.projects WHERE name = 'conductor-station');

INSERT OR REPLACE INTO archived_features SELECT * FROM source_db.archived_features 
WHERE project_id IN (SELECT id FROM source_db.projects WHERE name = 'conductor-station');

INSERT OR REPLACE INTO memories SELECT * FROM source_db.memories 
WHERE project_id IN (SELECT id FROM source_db.projects WHERE name = 'conductor-station');

INSERT OR REPLACE INTO handoffs SELECT * FROM source_db.handoffs 
WHERE project_id IN (SELECT id FROM source_db.projects WHERE name = 'conductor-station');

INSERT OR REPLACE INTO commits SELECT * FROM source_db.commits 
WHERE feature_id IN (SELECT id FROM source_db.features WHERE project_id IN (SELECT id FROM source_db.projects WHERE name = 'conductor-station'));

INSERT OR REPLACE INTO feature_errors SELECT * FROM source_db.feature_errors 
WHERE feature_id IN (SELECT id FROM source_db.features WHERE project_id IN (SELECT id FROM source_db.projects WHERE name = 'conductor-station'));

INSERT OR REPLACE INTO quality_reflections SELECT * FROM source_db.quality_reflections 
WHERE project_id IN (SELECT id FROM source_db.projects WHERE name = 'conductor-station');

COMMIT;

DETACH DATABASE source_db;
EOF

if [ $? -eq 0 ]; then
    echo "Import complete!"
    echo ""
    echo "Summary:"
    sqlite3 "$TARGET_DB" <<EOF
SELECT 'projects: ' || COUNT(*) FROM projects
UNION ALL SELECT 'sessions: ' || COUNT(*) FROM sessions
UNION ALL SELECT 'features: ' || COUNT(*) FROM features
UNION ALL SELECT 'archived_features: ' || COUNT(*) FROM archived_features
UNION ALL SELECT 'memories: ' || COUNT(*) FROM memories
UNION ALL SELECT 'handoffs: ' || COUNT(*) FROM handoffs
UNION ALL SELECT 'commits: ' || COUNT(*) FROM commits
UNION ALL SELECT 'feature_errors: ' || COUNT(*) FROM feature_errors
UNION ALL SELECT 'quality_reflections: ' || COUNT(*) FROM quality_reflections;
EOF
else
    echo "Error during import!"
    exit 1
fi
