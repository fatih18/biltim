import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface LocalAgentConfig {
	apiKey?: string;
	backendHttpUrl?: string;
	backendWsUrl?: string;
	computerName?: string;
	paused?: boolean;
}

const CONFIG_DIR = path.join(os.homedir(), ".vorion-agent");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const STOP_FILE = path.join(CONFIG_DIR, "agent.stop");

function ensureConfigDir(): void {
	if (!fs.existsSync(CONFIG_DIR)) {
		fs.mkdirSync(CONFIG_DIR, { recursive: true });
	}
}

export function loadLocalConfig(): LocalAgentConfig {
	try {
		if (fs.existsSync(CONFIG_FILE)) {
			const content = fs.readFileSync(CONFIG_FILE, "utf8");
			return JSON.parse(content) as LocalAgentConfig;
		}
	} catch {
		// Ignore parse errors, return empty config
	}
	return {};
}

export function saveLocalConfig(config: LocalAgentConfig): void {
	ensureConfigDir();
	const existing = loadLocalConfig();
	const merged = { ...existing, ...config };
	fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), "utf8");
}

export function getConfigPath(): string {
	return CONFIG_FILE;
}

export function isConfigured(): boolean {
	const config = loadLocalConfig();
	return Boolean(config.apiKey);
}

export function clearApiKey(): void {
	const config = loadLocalConfig();
	delete config.apiKey;
	ensureConfigDir();
	fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
}

export function createStopFlag(): void {
	ensureConfigDir();
	try {
		fs.writeFileSync(STOP_FILE, "stop", "utf8");
	} catch {
		// ignore
	}
}
