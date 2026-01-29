import { fail, redirect } from '@sveltejs/kit';
import { readdirSync, statSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { homedir } from 'os';
import { createConfig } from '$lib/server/config';
import { discoverDatabasesDetailed } from '$lib/server/db/discovery';
import type { Actions, PageServerLoad } from './$types';

type DirEntry = { name: string; path: string };

export const load: PageServerLoad = async () => {
	// Just return empty data, the form will handle the flow
	return {};
};

export const actions: Actions = {
	/**
	 * Browse directories: list roots (path empty) or children at path
	 */
	browse: async ({ request }) => {
		const formData = await request.formData();
		const pathRaw = formData.get('path');
		const pathInput = typeof pathRaw === 'string' ? pathRaw.trim() : '';

		if (!pathInput) {
			// Return roots
			const roots: DirEntry[] = [
				{ name: 'Home', path: homedir() },
				{ name: 'Current directory', path: process.cwd() }
			];
			return { roots };
		}

		// Resolve path: expand ~ and resolve to absolute
		let resolved = pathInput.replace(/^~($|\/)/, `${homedir()}$1`);
		resolved = resolve(resolved);

		if (!existsSync(resolved)) {
			return fail(400, { error: 'Path does not exist' });
		}

		const stat = statSync(resolved);
		if (!stat.isDirectory()) {
			return fail(400, { error: 'Path is not a directory' });
		}

		// List child directories
		let entries: { name: string }[];
		try {
			entries = readdirSync(resolved, { withFileTypes: true })
				.filter((e) => e.isDirectory() && !e.name.startsWith('.'))
				.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
				.map((e) => ({ name: e.name }));
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Cannot read directory';
			return fail(400, { error: msg });
		}

		const children: DirEntry[] = entries.map((e) => ({
			name: e.name,
			path: join(resolved, e.name)
		}));

		const parentPath = resolve(resolved, '..');
		const isRootDir = parentPath === resolved;
		// Back to roots view when we're one level below Home or Current dir
		const parent = isRootDir
			? null
			: resolved === homedir() || resolved === process.cwd()
				? 'roots'
				: parentPath;

		return {
			children,
			currentPath: resolved,
			parent
		};
	},

	/**
	 * Scan directories for Conductor databases
	 */
	scan: async ({ request }) => {
		const formData = await request.formData();
		const pathsRaw = formData.get('paths');

		if (!pathsRaw || typeof pathsRaw !== 'string') {
			return fail(400, { error: 'No paths provided' });
		}

		// Parse paths (comma or newline separated)
		const paths = pathsRaw
			.split(/[,\n]/)
			.map((p) => p.trim())
			.filter((p) => p.length > 0);

		if (paths.length === 0) {
			return fail(400, { error: 'No valid paths provided' });
		}

		// Discover databases
		const databases = discoverDatabasesDetailed(paths);

		return {
			success: true,
			paths,
			databases
		};
	},

	/**
	 * Create config and complete setup
	 */
	complete: async ({ request }) => {
		const formData = await request.formData();
		const pathsRaw = formData.get('paths');

		if (!pathsRaw || typeof pathsRaw !== 'string') {
			return fail(400, { error: 'No paths provided' });
		}

		// Parse paths
		const paths = pathsRaw
			.split(/[,\n]/)
			.map((p) => p.trim())
			.filter((p) => p.length > 0);

		if (paths.length === 0) {
			return fail(400, { error: 'No valid paths provided' });
		}

		// Create config
		createConfig(paths);

		// Redirect to dashboard
		throw redirect(303, '/');
	}
};
