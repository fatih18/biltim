import type { CommandResult } from "./executor";
import type { LocalAgentConfig } from "./localConfig";
import { loadLocalConfig, saveLocalConfig } from "./localConfig";

export type CommandSource = "remote" | "local";

export interface CommandLogEntry {
	id: string;
	source: CommandSource;
	command: string;
	args: string[];
	createdAt: string;
	result?: CommandResult;
}

let paused = false;

// Initialize pause state from local config
try {
	const cfg = loadLocalConfig() as LocalAgentConfig;
	if (typeof cfg.paused === "boolean") {
		paused = cfg.paused;
	}
} catch {
	paused = false;
}

const logs: CommandLogEntry[] = [];
const MAX_LOGS = 50;

export function isPaused(): boolean {
	return paused;
}

export function setPaused(value: boolean): void {
	paused = value;
	const partial: Partial<LocalAgentConfig> = { paused: value };
	saveLocalConfig(partial);
}

export function addCommandLog(entry: CommandLogEntry): void {
	logs.push(entry);
	if (logs.length > MAX_LOGS) {
		logs.splice(0, logs.length - MAX_LOGS);
	}
}

export function getCommandLogs(): CommandLogEntry[] {
	// Newest first
	return [...logs].reverse();
}
