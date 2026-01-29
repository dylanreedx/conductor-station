import Database from 'better-sqlite3';
import { statSync, existsSync, realpathSync } from 'fs';
import type { DatabaseConnection } from './types';

// Store active database connections (keyed by realpath so same physical DB is never opened twice)
const connections = new Map<string, { db: Database.Database; meta: DatabaseConnection }>();

function resolveKey(path: string): string {
	try {
		return realpathSync(path);
	} catch {
		return path;
	}
}

/**
 * Derive a unique alias from the database path
 * /Users/dylan/Documents/work/selectus/.conductor/conductor.db -> "selectus"
 * /Users/dylan/Documents/work/.conductor/conductor.db -> "work"
 */
function deriveAlias(dbPath: string): string {
	const parts = dbPath.split('/');
	const conductorIdx = parts.indexOf('.conductor');

	if (conductorIdx > 0) {
		return parts[conductorIdx - 1];
	}

	return 'root';
}

/**
 * Derive a unique alias, handling collisions
 */
function deriveUniqueAlias(dbPath: string): string {
	let alias = deriveAlias(dbPath);

	// Check for collision
	for (const [path, conn] of connections.entries()) {
		if (conn.meta.alias === alias && path !== dbPath) {
			// Add parent directory to make unique
			const parts = dbPath.split('/');
			const conductorIdx = parts.indexOf('.conductor');
			if (conductorIdx > 1) {
				alias = `${parts[conductorIdx - 2]}/${alias}`;
			}
			break;
		}
	}

	return alias;
}

/**
 * Run a function with a read-write connection to the database at path.
 * Opens a separate connection (not from the pool), runs fn, then closes.
 * Use only for write operations (e.g. mark session complete).
 */
export function runWithWriteConnection<T>(path: string, fn: (db: Database.Database) => T): T {
	if (!existsSync(path)) {
		throw new Error(`Database not found: ${path}`);
	}
	const db = new Database(path, { readonly: false });
	try {
		return fn(db);
	} finally {
		db.close();
	}
}

/**
 * Open a database connection in read-only mode.
 * Keyed by realpath so the same physical file is never opened twice (e.g. after removing old paths and adding parent).
 */
export function openDatabase(path: string): DatabaseConnection {
	const key = resolveKey(path);
	const existing = connections.get(key);
	if (existing) {
		return existing.meta;
	}

	if (!existsSync(path)) {
		throw new Error(`Database not found: ${path}`);
	}

	const alias = deriveUniqueAlias(path);
	const stat = statSync(path);
	const db = new Database(path, { readonly: true });

	// Get project count for metadata
	let projectCount = 0;
	let isValid = false;

	try {
		const countResult = db.prepare('SELECT COUNT(*) as count FROM projects').get() as {
			count: number;
		};
		projectCount = countResult.count;
		isValid = true;
	} catch {
		// Not a valid Conductor database
		isValid = false;
	}

	const meta: DatabaseConnection = {
		path: key,
		alias,
		mtime: stat.mtimeMs,
		projectCount,
		isValid
	};

	connections.set(key, { db, meta });
	return meta;
}

/**
 * Get a database connection by path or alias
 */
export function getDatabase(
	aliasOrPath: string
): { db: Database.Database; meta: DatabaseConnection } | undefined {
	const byPath = connections.get(aliasOrPath);
	if (byPath) return byPath;

	// Try resolved path (e.g. path string that normalizes to our key)
	try {
		const key = realpathSync(aliasOrPath);
		const byResolved = connections.get(key);
		if (byResolved) return byResolved;
	} catch {
		// Not a path or broken symlink
	}

	// Try by alias
	for (const conn of connections.values()) {
		if (conn.meta.alias === aliasOrPath) {
			return conn;
		}
	}

	return undefined;
}

/**
 * Get all active database connections
 */
export function getActiveDatabases(): { db: Database.Database; meta: DatabaseConnection }[] {
	return Array.from(connections.values()).filter((conn) => conn.meta.isValid);
}

/**
 * Get metadata for all databases (without the connection object)
 */
export function getDatabasesMeta(): DatabaseConnection[] {
	return Array.from(connections.values())
		.filter((conn) => conn.meta.isValid)
		.map((conn) => conn.meta);
}

/**
 * Update the mtime for a database
 */
export function updateMtime(path: string): number {
	const key = resolveKey(path);
	const conn = connections.get(key);
	if (conn && existsSync(path)) {
		const stat = statSync(path);
		conn.meta.mtime = stat.mtimeMs;
		return conn.meta.mtime;
	}
	return 0;
}

/**
 * Check if a database file has been modified since last check
 */
export function checkMtimeChanged(path: string): boolean {
	const key = resolveKey(path);
	const conn = connections.get(key);
	if (!conn || !existsSync(path)) return false;

	const stat = statSync(path);
	return stat.mtimeMs > conn.meta.mtime;
}

/**
 * Close a specific database connection
 */
export function closeDatabase(path: string): void {
	const key = resolveKey(path);
	const conn = connections.get(key);
	if (conn) {
		conn.db.close();
		connections.delete(key);
	}
}

/**
 * Close all database connections
 */
export function closeAll(): void {
	for (const conn of connections.values()) {
		conn.db.close();
	}
	connections.clear();
}

/**
 * Reopen all database connections (useful after config change)
 */
export function reopenAll(): void {
	const paths = Array.from(connections.keys());
	closeAll();
	for (const path of paths) {
		try {
			openDatabase(path);
		} catch {
			// Skip databases that can't be reopened
		}
	}
}

/**
 * Get the number of active connections
 */
export function getConnectionCount(): number {
	return Array.from(connections.values()).filter((conn) => conn.meta.isValid).length;
}
