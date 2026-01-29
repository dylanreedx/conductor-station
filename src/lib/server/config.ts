import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import type { Config } from './db/types';

const CONFIG_FILENAME = 'conductor-station.config.json';

/**
 * Get the config file path
 */
function getConfigPath(): string {
	// Config file is in the project root
	return join(process.cwd(), CONFIG_FILENAME);
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: Config = {
	scanPaths: [],
	scanDepth: 5,
	excludePatterns: [
		'node_modules',
		'.git',
		'dist',
		'build',
		'.next',
		'.svelte-kit',
		'coverage',
		'__pycache__',
		'.venv',
		'venv'
	],
	sync: {
		defaultInterval: 120_000, // 2 minutes
		liveInterval: 5_000, // 5 seconds
		cacheTTL: 30_000 // 30 seconds
	},
	theme: 'system'
};

/**
 * Delete the config file. No-op if it does not exist.
 */
export function deleteConfig(): void {
	const configPath = getConfigPath();
	if (existsSync(configPath)) {
		unlinkSync(configPath);
	}
}

/**
 * Check if config file exists
 */
export function configExists(): boolean {
	return existsSync(getConfigPath());
}

/**
 * Load configuration from file
 */
export function loadConfig(): Config {
	const configPath = getConfigPath();

	if (!existsSync(configPath)) {
		return DEFAULT_CONFIG;
	}

	try {
		const raw = readFileSync(configPath, 'utf-8');
		const parsed = JSON.parse(raw);

		// Merge with defaults to ensure all fields exist
		return {
			...DEFAULT_CONFIG,
			...parsed,
			sync: {
				...DEFAULT_CONFIG.sync,
				...parsed.sync
			}
		};
	} catch (error) {
		console.error('[Config] Error loading config file:', error);
		return DEFAULT_CONFIG;
	}
}

/**
 * Save configuration to file
 */
export function saveConfig(config: Config): void {
	const configPath = getConfigPath();
	writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Create initial config with specified scan paths
 */
export function createConfig(scanPaths: string[]): Config {
	const config: Config = {
		...DEFAULT_CONFIG,
		scanPaths
	};

	saveConfig(config);
	return config;
}

/**
 * Update scan paths in config
 */
export function updateScanPaths(scanPaths: string[]): Config {
	const config = loadConfig();
	config.scanPaths = scanPaths;
	saveConfig(config);
	return config;
}

/**
 * Add a scan path to config
 */
export function addScanPath(path: string): Config {
	const config = loadConfig();
	if (!config.scanPaths.includes(path)) {
		config.scanPaths.push(path);
		saveConfig(config);
	}
	return config;
}

/**
 * Remove a scan path from config
 */
export function removeScanPath(path: string): Config {
	const config = loadConfig();
	config.scanPaths = config.scanPaths.filter((p) => p !== path);
	saveConfig(config);
	return config;
}

/**
 * Update theme in config
 */
export function updateTheme(theme: 'light' | 'dark' | 'system'): Config {
	const config = loadConfig();
	config.theme = theme;
	saveConfig(config);
	return config;
}

/**
 * Update sync settings
 */
export function updateSyncSettings(sync: Partial<Config['sync']>): Config {
	const config = loadConfig();
	config.sync = { ...config.sync, ...sync };
	saveConfig(config);
	return config;
}
