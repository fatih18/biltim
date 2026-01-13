import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { loadLocalConfig } from "./localConfig";

// Try to import embedded config (generated at build time)
let EMBEDDED_CONFIG: {
	DESKTOP_BACKEND_HTTP_URL?: string;
	DESKTOP_BACKEND_WS_URL?: string;
	DESKTOP_AGENT_API_KEY?: string;
} = {};

try {
	// @ts-expect-error - This file is generated at build time
	const embedded = await import("./embedded-config");
	EMBEDDED_CONFIG = embedded.EMBEDDED_CONFIG || {};
} catch {
	// No embedded config, will use env vars
}

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface AgentConfig {
	port: number;
	backendHttpUrl?: string;
	backendWsUrl?: string;
	agentId: string;
	apiKey?: string;
	heartbeatIntervalMs: number;
	logLevel: LogLevel;
	commandTimeoutMs: number;
	commandMaxOutputBytes: number;
}

const AGENT_ID_FILE = ".nucleus-desktop-agent-id";

function resolveAgentIdFile(): string {
	try {
		return path.join(process.cwd(), AGENT_ID_FILE);
	} catch {
		return AGENT_ID_FILE;
	}
}

function ensureAgentId(): string {
	const fromEnv = process.env.DESKTOP_AGENT_ID?.trim();
	if (fromEnv) return fromEnv;

	const filePath = resolveAgentIdFile();

	try {
		if (fs.existsSync(filePath)) {
			const existing = fs.readFileSync(filePath, "utf8").trim();
			if (existing) return existing;
		}
	} catch {
		// ignore and fall through to generate new id
	}

	const id = randomUUID();

	try {
		fs.writeFileSync(filePath, id, { encoding: "utf8" });
	} catch {
		// ignore write errors, id will still be used in memory
	}

	return id;
}

export function loadConfig(): AgentConfig {
	const portEnv = process.env.DESKTOP_AGENT_PORT ?? "5050";
	const heartbeatEnv = process.env.DESKTOP_AGENT_HEARTBEAT_MS ?? "30000";
	const logLevelEnv = (
		process.env.DESKTOP_AGENT_LOG_LEVEL ?? "info"
	).toLowerCase() as LogLevel;
	const commandTimeoutEnv =
		process.env.DESKTOP_AGENT_COMMAND_TIMEOUT_MS ?? "30000";
	const commandMaxOutputEnv =
		process.env.DESKTOP_AGENT_COMMAND_MAX_OUTPUT_BYTES ?? "16384";

	// Load local config from ~/.vorion-agent/config.json
	const localConfig = loadLocalConfig();

	// Priority: env vars > local config > embedded config
	const backendHttpUrl =
		process.env.DESKTOP_BACKEND_HTTP_URL?.trim() ||
		localConfig.backendHttpUrl ||
		EMBEDDED_CONFIG.DESKTOP_BACKEND_HTTP_URL ||
		undefined;
	const backendWsUrl =
		process.env.DESKTOP_BACKEND_WS_URL?.trim() ||
		localConfig.backendWsUrl ||
		EMBEDDED_CONFIG.DESKTOP_BACKEND_WS_URL ||
		undefined;
	const apiKey =
		process.env.DESKTOP_AGENT_API_KEY?.trim() ||
		localConfig.apiKey ||
		EMBEDDED_CONFIG.DESKTOP_AGENT_API_KEY ||
		undefined;

	const port = Number(portEnv) || 5050;
	const heartbeatIntervalMs = Number(heartbeatEnv) || 30000;
	const commandTimeoutMs = Number(commandTimeoutEnv) || 30000;
	const commandMaxOutputBytes = Number(commandMaxOutputEnv) || 16384;

	const allowedLevels: LogLevel[] = ["debug", "info", "warn", "error"];
	const logLevel: LogLevel = allowedLevels.includes(logLevelEnv)
		? logLevelEnv
		: "info";

	const agentId = ensureAgentId();

	return {
		port,
		backendHttpUrl,
		backendWsUrl,
		agentId,
		apiKey,
		heartbeatIntervalMs,
		logLevel,
		commandTimeoutMs,
		commandMaxOutputBytes,
	};
}
