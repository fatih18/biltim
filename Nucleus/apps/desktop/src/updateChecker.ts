import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import type { AgentConfig } from "./config";
import type { Logger } from "./logger";

interface DownloadFileInfo {
	filename: string;
	size: number;
	hash?: string; // MD5 hash for reliable version comparison
}

interface DownloadsResponse {
	success?: boolean;
	files?: DownloadFileInfo[];
}

export type UpdateCheckStatus =
	| "no-backend"
	| "unsupported-platform"
	| "request-failed"
	| "no-entry"
	| "up-to-date"
	| "update-scheduled"
	| "error";

export interface UpdateCheckResult {
	status: UpdateCheckStatus;
	message: string;
	localSize?: number | null;
	remoteSize?: number | null;
	localHash?: string | null;
	remoteHash?: string | null;
}

function getPlatformFilename(): string | null {
	const platform = os.platform();
	const arch = os.arch();

	if (platform === "darwin") {
		// Separate binaries for Apple Silicon vs Intel
		if (arch === "arm64") return "desktop-agent-macos-arm64";
		return "desktop-agent-macos-x64";
	}

	if (platform === "win32") {
		return "desktop-agent-windows-x64.exe";
	}

	if (platform === "linux") {
		return "desktop-agent-linux-x64";
	}

	return null;
}

let updateScheduled = false;

export async function checkForUpdates(
	config: AgentConfig,
	logger: Logger,
): Promise<UpdateCheckResult> {
	if (!config.backendHttpUrl) {
		logger.debug("No backend HTTP URL configured, skipping update check");
		return {
			status: "no-backend",
			message: "No backend HTTP URL configured for updates.",
		};
	}

	const platformFilename = getPlatformFilename();
	if (!platformFilename) {
		logger.debug("Unsupported platform for auto-update, skipping");
		return {
			status: "unsupported-platform",
			message: "Auto-update is not supported on this platform.",
		};
	}

	try {
		const base = config.backendHttpUrl.replace(/\/$/, "");
		const url = `${base}/api/downloads/desktop-agent`;

		logger.debug("Checking for desktop agent updates", {
			url,
			platformFilename,
		});

		const res = await fetch(url, {
			headers: {
				accept: "application/json",
			},
		});

		if (!res.ok) {
			logger.warn("Update check failed", { status: res.status });
			return {
				status: "request-failed",
				message: `Update check failed with status ${res.status}.`,
			};
		}

		const data = (await res.json()) as DownloadsResponse;
		const files = Array.isArray(data.files) ? data.files : [];
		const entry = files.find((f) => f.filename === platformFilename);

		if (!entry || typeof entry.size !== "number") {
			logger.debug("No matching download entry for current platform", {
				platformFilename,
			});
			return {
				status: "no-entry",
				message: "No matching download entry found for this platform.",
			};
		}

		let localSize: number | null = null;
		let localHash: string | null = null;

		try {
			const stat = fs.statSync(process.execPath);
			localSize = stat.size;

			// Calculate local binary hash for reliable comparison
			const localBuffer = fs.readFileSync(process.execPath);
			localHash = createHash("md5").update(localBuffer).digest("hex");
		} catch (error) {
			logger.warn("Failed to read current executable for update check", {
				execPath: process.execPath,
				error,
			});
		}

		// Compare by hash if available (most reliable), fallback to size
		const remoteHash = entry.hash || null;
		const isUpToDate =
			remoteHash && localHash
				? localHash === remoteHash
				: localSize === entry.size;

		if (isUpToDate) {
			logger.debug("Desktop agent binary is up to date", {
				localSize,
				remoteSize: entry.size,
				localHash,
				remoteHash,
			});
			return {
				status: "up-to-date",
				message: "Desktop agent binary is up to date.",
				localSize,
				remoteSize: entry.size,
				localHash,
				remoteHash,
			};
		}

		if (updateScheduled) {
			return {
				status: "update-scheduled",
				message: "Update already scheduled.",
				localSize,
				remoteSize: entry.size,
				localHash,
				remoteHash,
			};
		}

		updateScheduled = true;
		logger.info("New desktop agent version detected, exiting for auto-update", {
			localSize,
			remoteSize: entry.size,
			localHash,
			remoteHash,
		});

		// macOS .command launcher will download the latest binary before restart.
		// On other platforms this will just stop the agent; user can restart manually.
		setTimeout(() => {
			process.exit(0);
		}, 1000);

		return {
			status: "update-scheduled",
			message:
				"New desktop agent version detected. Agent will exit so the launcher can download the update.",
			localSize,
			remoteSize: entry.size,
			localHash,
			remoteHash,
		};
	} catch (error) {
		logger.warn("Desktop agent update check failed", error);
		return {
			status: "error",
			message: "Desktop agent update check failed.",
		};
	}
}

export function scheduleAutoUpdate(config: AgentConfig, logger: Logger): void {
	if (!config.backendHttpUrl) return;

	// Allow overriding interval via env, default 6 hours
	const intervalEnv =
		process.env.DESKTOP_AGENT_UPDATE_INTERVAL_MS ?? "21600000";
	const intervalMs = Number(intervalEnv) || 21600000;

	// Run first check with a slight delay so startup/registration can complete
	setTimeout(() => {
		void checkForUpdates(config, logger);
	}, 60_000);

	if (intervalMs > 0) {
		setInterval(() => {
			void checkForUpdates(config, logger);
		}, intervalMs);
	}
}
