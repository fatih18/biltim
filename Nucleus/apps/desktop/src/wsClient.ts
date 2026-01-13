import { addCommandLog, isPaused } from "./agentState";
import type { AgentConfig } from "./config";
import { type CommandResult, executeCommand } from "./executor";
import type { Logger } from "./logger";

export function connectWebSocket(config: AgentConfig, logger: Logger): void {
	if (!config.backendWsUrl) {
		logger.debug("No backend WS URL configured, skipping WebSocket connection");
		return;
	}

	try {
		const url = new URL(config.backendWsUrl);
		url.searchParams.set("agentId", config.agentId);
		if (config.apiKey) url.searchParams.set("apiKey", config.apiKey);

		const socket = new WebSocket(url.toString());

		socket.onopen = () => {
			logger.info("Connected to backend WebSocket");
			try {
				const helloMessage = {
					type: "hello",
					agentId: config.agentId,
					version: "0.1.0",
				};
				socket.send(JSON.stringify(helloMessage));
			} catch (error) {
				logger.error("Failed to send hello message over WebSocket", error);
			}
		};

		socket.onmessage = async (event) => {
			try {
				if (typeof event.data !== "string") {
					logger.warn("Received non-string message from backend WebSocket", {
						type: typeof event.data,
					});
					return;
				}

				const message = JSON.parse(event.data) as {
					type?: string;
					commandId?: string;
					command?: string;
					args?: string[];
					cwd?: string;
					timeoutMs?: number;
				};

				if (message.type === "command" && message.command) {
					logger.info("Received remote command", {
						commandId: message.commandId,
						command: message.command,
						args: message.args,
					});

					// Pause mode: do not execute commands, just report skipped
					if (isPaused()) {
						logger.info("Agent is in pause mode, skipping command execution", {
							commandId: message.commandId,
						});

						const now = new Date().toISOString();
						const pausedResult: CommandResult = {
							command: message.command,
							args: message.args ?? [],
							exitCode: null,
							stdout: "",
							stderr: "Agent pause modunda, komut çalıştırılmadı.",
							timedOut: false,
							startedAt: now,
							finishedAt: now,
							durationMs: 0,
						};

						addCommandLog({
							id: message.commandId || now,
							source: "remote",
							command: message.command,
							args: message.args ?? [],
							createdAt: now,
							result: pausedResult,
						});

						const pausedResponse = {
							type: "commandResult" as const,
							commandId: message.commandId,
							result: pausedResult,
						};

						try {
							socket.send(JSON.stringify(pausedResponse));
						} catch (error) {
							logger.error(
								"Failed to send paused commandResult over WebSocket",
								error,
							);
						}

						return;
					}

					const result = await executeCommand(
						{
							command: message.command,
							args: message.args,
							cwd: message.cwd,
							timeoutMs: message.timeoutMs,
						},
						config,
						logger,
					);

					addCommandLog({
						id: message.commandId || result.startedAt,
						source: "remote",
						command: message.command,
						args: message.args ?? [],
						createdAt: result.startedAt,
						result,
					});

					const response = {
						type: "commandResult" as const,
						commandId: message.commandId,
						result,
					};

					try {
						socket.send(JSON.stringify(response));
					} catch (error) {
						logger.error("Failed to send commandResult over WebSocket", error);
					}
				} else {
					logger.debug("Received backend WebSocket message", {
						type: message.type,
					});
				}
			} catch (error) {
				logger.error("Failed to handle backend WebSocket message", error);
			}
		};

		socket.onerror = (event) => {
			logger.error("WebSocket error", event);
		};

		socket.onclose = (event) => {
			logger.warn("Backend WebSocket connection closed", {
				code: event.code,
				reason: event.reason,
				wasClean: event.wasClean,
			});

			if (!event.wasClean) {
				setTimeout(() => {
					connectWebSocket(config, logger);
				}, 5000);
			}
		};
	} catch (error) {
		logger.error("Failed to initialize WebSocket connection", error);
	}
}
