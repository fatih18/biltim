import os from "node:os";
import type { AgentConfig } from "./config";
import { clearApiKey } from "./localConfig";
import type { Logger } from "./logger";

export class BackendClient {
	private readonly baseUrl: string | undefined;

	constructor(
		private readonly config: AgentConfig,
		private readonly logger: Logger,
	) {
		this.baseUrl = config.backendHttpUrl?.replace(/\/+$/, "");
	}

	private ensureBaseUrl(): string | null {
		if (!this.baseUrl) {
			this.logger.debug("No backend HTTP URL configured, skipping HTTP call");
			return null;
		}
		return this.baseUrl;
	}

	async registerComputer(): Promise<void> {
		const baseUrl = this.ensureBaseUrl();
		if (!baseUrl) return;

		if (!this.config.apiKey) {
			this.logger.warn(
				"DESKTOP_AGENT_API_KEY is not set, skipping registerComputer",
			);
			return;
		}

		const url = `${baseUrl}/api/remote/computers/register`;

		const body = {
			agentId: this.config.agentId,
			hostname: os.hostname(),
			platform: os.platform(),
			arch: os.arch(),
		};

		try {
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-agent-api-key": this.config.apiKey,
				},
				body: JSON.stringify(body),
			});

			if (!response.ok) {
				// 404 = API key ile eşleşen bilgisayar yok
				// 401 = API key geçersiz
				if (response.status === 404 || response.status === 401) {
					this.logger.error(
						"❌ API key geçersiz veya bu key ile eşleşen bilgisayar yok!",
					);
					this.logger.error(
						"   → Web arayüzünden yeni bir bilgisayar oluşturun",
					);
					this.logger.error(
						"   → Verilen API key'i http://127.0.0.1:5050/setup adresine girin",
					);
					// Geçersiz key'i config'den temizle
					clearApiKey();
					this.logger.info(
						"   → Eski API key temizlendi. Agent'ı yeniden başlatın.",
					);
				} else {
					this.logger.warn("registerComputer failed", {
						status: response.status,
					});
				}
				return;
			}

			this.logger.info("registerComputer succeeded");
		} catch (error) {
			this.logger.error("registerComputer request failed", error);
			setTimeout(() => {
				void this.registerComputer();
			}, 5000);
		}
	}

	async sendHeartbeat(): Promise<void> {
		const baseUrl = this.ensureBaseUrl();
		if (!baseUrl) return;

		if (!this.config.apiKey) {
			this.logger.warn("DESKTOP_AGENT_API_KEY is not set, skipping heartbeat");
			return;
		}

		const url = `${baseUrl}/api/remote/computers/heartbeat`;

		const body = {
			agentId: this.config.agentId,
			timestamp: new Date().toISOString(),
			status: "online",
		};

		try {
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-agent-api-key": this.config.apiKey,
				},
				body: JSON.stringify(body),
			});

			if (!response.ok) {
				if (response.status === 404) {
					this.logger.warn("heartbeat failed with 404, attempting re-register");
					await this.registerComputer();
				} else {
					this.logger.warn("heartbeat failed", { status: response.status });
				}
				return;
			}

			this.logger.debug("heartbeat sent successfully");
		} catch (error) {
			this.logger.error("heartbeat request failed", error);
		}
	}
}
