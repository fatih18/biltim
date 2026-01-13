import os from "node:os";
import { Elysia } from "elysia";
import { getCommandLogs, isPaused, setPaused } from "./agentState";
import { BackendClient } from "./backendClient";
import { loadConfig } from "./config";
import { executeCommand } from "./executor";
import { createStopFlag, isConfigured, saveLocalConfig } from "./localConfig";
import { createLogger } from "./logger";
import { getHomePageHTML, getSetupPageHTML } from "./setupUI";
import { checkForUpdates, scheduleAutoUpdate } from "./updateChecker";
import { connectWebSocket } from "./wsClient";

async function main() {
	const config = loadConfig();
	const logger = createLogger(config);

	logger.info("Starting desktop agent", {
		port: config.port,
		backendHttpUrl: config.backendHttpUrl,
		backendWsUrl: config.backendWsUrl,
		heartbeatIntervalMs: config.heartbeatIntervalMs,
		logLevel: config.logLevel,
	});

	const app = new Elysia({ name: "desktop-agent" })
		// Home page
		.get("/", ({ set }) => {
			set.headers["content-type"] = "text/html; charset=utf-8";
			return getHomePageHTML(config);
		})
		// Setup page
		.get("/setup", ({ set }) => {
			set.headers["content-type"] = "text/html; charset=utf-8";
			return getSetupPageHTML(config);
		})
		// Save setup config
		.post("/setup", async ({ body, set }) => {
			const { apiKey, backendHttpUrl, backendWsUrl } = (body ?? {}) as {
				apiKey?: string;
				backendHttpUrl?: string;
				backendWsUrl?: string;
			};

			if (!apiKey?.trim()) {
				set.status = 400;
				return { success: false, message: "API key is required" };
			}

			try {
				saveLocalConfig({
					apiKey: apiKey.trim(),
					backendHttpUrl: backendHttpUrl?.trim() || undefined,
					backendWsUrl: backendWsUrl?.trim() || undefined,
				});

				// Config kaydedildikten sonra agent'ı otomatik yeniden başlat
				logger.info("Config saved, restarting agent...");
				setTimeout(() => {
					process.exit(0); // launchd/nohup ile tekrar başlayacak
				}, 500);

				return {
					success: true,
					message: "Config saved. Agent is restarting...",
				};
			} catch (error) {
				logger.error("Failed to save config", error);
				set.status = 500;
				return { success: false, message: "Failed to save config" };
			}
		})
		// Stop agent
		.post("/stop", ({ set }) => {
			set.status = 200;
			logger.info("Stop requested via UI, shutting down...");
			createStopFlag();
			setTimeout(() => process.exit(0), 100);
			return { success: true, message: "Agent is stopping..." };
		})
		// Health check
		.get("/health", () => "OK")
		// Runtime state
		.get("/state", () => ({
			hostname: os.hostname(),
			platform: os.platform(),
			arch: os.arch(),
			agentId: config.agentId,
			configured: isConfigured(),
			paused: isPaused(),
			backendHttpUrl: config.backendHttpUrl,
		}))
		// Recent command logs
		.get("/logs", () => ({
			logs: getCommandLogs(),
		}))
		// Toggle pause mode
		.post("/pause", ({ set }) => {
			const next = !isPaused();
			setPaused(next);
			logger.info(next ? "Agent paused via UI" : "Agent resumed via UI");
			set.status = 200;
			return {
				success: true,
				paused: next,
				message: next
					? "Agent paused. Remote commands will not be executed."
					: "Agent resumed. Remote commands will be executed again.",
			};
		})
		.post("/update-check", async ({ set }) => {
			set.status = 200;
			const result = await checkForUpdates(config, logger);
			return {
				success: true,
				result,
			};
		})
		// Info endpoint
		.get("/info", () => ({
			hostname: os.hostname(),
			platform: os.platform(),
			arch: os.arch(),
			agentId: config.agentId,
			configured: isConfigured(),
		}))
		// Execute command
		.post("/execute", async ({ body }) => {
			const { command, args, cwd, timeoutMs } = (body ?? {}) as {
				command?: string;
				args?: string[];
				cwd?: string;
				timeoutMs?: number;
			};

			if (!command || typeof command !== "string" || !command.trim()) {
				return {
					success: false,
					error: "command is required",
				};
			}

			const result = await executeCommand(
				{
					command,
					args,
					cwd,
					timeoutMs,
				},
				config,
				logger,
			);

			return {
				success: true,
				result,
			};
		})
		.listen(config.port);

	logger.info("Desktop agent HTTP server started", {
		hostname: app.server?.hostname,
		port: app.server?.port,
	});

	const backendClient = new BackendClient(config, logger);

	try {
		await backendClient.registerComputer();
	} catch (error) {
		logger.error("Failed to register computer on startup", error);
	}

	if (config.heartbeatIntervalMs > 0) {
		setInterval(() => {
			void backendClient.sendHeartbeat();
		}, config.heartbeatIntervalMs);
	}

	connectWebSocket(config, logger);
	scheduleAutoUpdate(config, logger);
}

void main();
