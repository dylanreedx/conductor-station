import { readdirSync, statSync, existsSync, realpathSync } from 'fs';
import { join } from 'path';
import Database from 'better-sqlite3';

// Required tables for a valid Conductor database
const REQUIRED_TABLES = [
	'projects',
	'sessions',
	'features',
	'memories',
	'handoffs',
	'commits',
	'feature_errors',
	'quality_reflections'
];

/**
 * Validate that a SQLite file is a Conductor database by checking for required tables
 */
export function validateConductorDb(dbPath: string): boolean {
	if (!existsSync(dbPath)) {
		return false;
	}

	try {
		const db = new Database(dbPath, { readonly: true });

		// Get all table names
		const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {
			name: string;
		}[];

		const tableNames = new Set(tables.map((t) => t.name));

		db.close();

		// Check that all required tables exist
		return REQUIRED_TABLES.every((table) => tableNames.has(table));
	} catch {
		return false;
	}
}

/**
 * Recursively scan directories for Conductor databases
 */
export function discoverDatabases(
	scanPaths: string[],
	excludePatterns: string[] = ['node_modules', '.git', 'dist', 'build'],
	maxDepth: number = 5
): string[] {
	const found: string[] = [];

	function shouldExclude(name: string): boolean {
		return excludePatterns.some((pattern) => {
			// Simple glob matching for common patterns
			if (pattern.includes('*')) {
				const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
				return regex.test(name);
			}
			return name === pattern;
		});
	}

	function scan(dir: string, depth: number): void {
		if (depth > maxDepth) return;

		// Check for .conductor/conductor.db in this directory
		const conductorDb = join(dir, '.conductor', 'conductor.db');
		if (existsSync(conductorDb)) {
			// Validate it's actually a Conductor database
			if (validateConductorDb(conductorDb)) {
				found.push(conductorDb);
			}
		}

		// Scan subdirectories
		try {
			const entries = readdirSync(dir, { withFileTypes: true });

			for (const entry of entries) {
				if (!entry.isDirectory()) continue;
				if (shouldExclude(entry.name)) continue;
				if (entry.name.startsWith('.') && entry.name !== '.conductor') continue;

				const fullPath = join(dir, entry.name);

				// Don't recurse into .conductor directories
				if (entry.name === '.conductor') continue;

				scan(fullPath, depth + 1);
			}
		} catch {
			// Permission denied or other error - skip this directory
		}
	}

	for (const scanPath of scanPaths) {
		if (existsSync(scanPath) && statSync(scanPath).isDirectory()) {
			scan(scanPath, 0);
		}
	}

	// Deduplicate by realpath so same physical DB appears once (symlinks, overlapping roots)
	const seen = new Set<string>();
	const deduped: string[] = [];
	for (const p of found) {
		try {
			const resolved = realpathSync(p);
			if (seen.has(resolved)) continue;
			seen.add(resolved);
			deduped.push(p);
		} catch {
			// Broken symlink or other error: keep original path
			if (!seen.has(p)) {
				seen.add(p);
				deduped.push(p);
			}
		}
	}
	return deduped;
}

/**
 * Discover databases and return detailed information
 */
export function discoverDatabasesDetailed(
	scanPaths: string[],
	excludePatterns: string[] = ['node_modules', '.git', 'dist', 'build'],
	maxDepth: number = 5
): Array<{
	path: string;
	alias: string;
	projectCount: number;
	isValid: boolean;
}> {
	const dbPaths = discoverDatabases(scanPaths, excludePatterns, maxDepth);

	return dbPaths.map((dbPath) => {
		const parts = dbPath.split('/');
		const conductorIdx = parts.indexOf('.conductor');
		const alias = conductorIdx > 0 ? parts[conductorIdx - 1] : 'root';

		let projectCount = 0;
		let isValid = false;

		try {
			const db = new Database(dbPath, { readonly: true });
			const result = db.prepare('SELECT COUNT(*) as count FROM projects').get() as {
				count: number;
			};
			projectCount = result.count;
			isValid = true;
			db.close();
		} catch {
			isValid = false;
		}

		return {
			path: dbPath,
			alias,
			projectCount,
			isValid
		};
	});
}

/**
 * Get the project directory from a database path
 */
export function getProjectDirFromDbPath(dbPath: string): string {
	// /Users/dylan/Documents/work/selectus/.conductor/conductor.db
	// -> /Users/dylan/Documents/work/selectus
	const parts = dbPath.split('/');
	const conductorIdx = parts.indexOf('.conductor');
	if (conductorIdx > 0) {
		return parts.slice(0, conductorIdx).join('/');
	}
	return dbPath;
}
