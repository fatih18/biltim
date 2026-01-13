import type { AgentConfig, LogLevel } from "./config";

export interface Logger {
	debug: (message: string, meta?: unknown) => void;
	info: (message: string, meta?: unknown) => void;
	warn: (message: string, meta?: unknown) => void;
	error: (message: string, meta?: unknown) => void;
}

const LEVELS: LogLevel[] = ["debug", "info", "warn", "error"];

export function createLogger(config: AgentConfig): Logger {
	const minLevelIndex = LEVELS.indexOf(config.logLevel);

	const log = (level: LogLevel, message: string, meta?: unknown) => {
		const levelIndex = LEVELS.indexOf(level);
		if (minLevelIndex === -1 || levelIndex < minLevelIndex) return;

		const timestamp = new Date().toISOString();
		const prefix = `[${timestamp}] [desktop-agent] [${level.toUpperCase()}]`;

		if (meta !== undefined) {
			console.log(prefix, message, meta);
		} else {
			console.log(prefix, message);
		}
	};

	return {
		debug: (message, meta) => log("debug", message, meta),
		info: (message, meta) => log("info", message, meta),
		warn: (message, meta) => log("warn", message, meta),
		error: (message, meta) => log("error", message, meta),
	};
}
