/**
 * Connection manager for Dapr
 */

import { CommunicationProtocolEnum, DaprClient, HttpMethod } from "@dapr/dapr";
import {
	CONNECTION_STATUS,
	DEFAULT_CONNECTION_TIMEOUT_MS,
	DEFAULT_DAPR_HOST,
	DEFAULT_DAPR_PORT,
	DEFAULT_HEALTH_CHECK_TIMEOUT_MS,
	DEFAULT_MAX_BODY_SIZE_MB,
	ENV_DAPR_API_TOKEN,
	ENV_DAPR_GRPC_ENDPOINT,
	ENV_DAPR_HOST,
	ENV_DAPR_HTTP_ENDPOINT,
	ENV_DAPR_HTTP_PORT,
	HEALTH_STATUS,
} from "./constants";
import { createConnectionError } from "./error-handling";
import type { DaprConnectionOptions, DaprLogger, HealthStatus } from "./types";
import { createDefaultLogger, withTimeout } from "./utils";

export class DaprConnectionManager {
	private client: DaprClient | null = null;
	private daprHost: string;
	private daprPort: string;
	private communicationProtocol: CommunicationProtocolEnum;
	private maxBodySizeMb: number;
	private daprApiToken?: string;
	private logger: DaprLogger;
	private connectionStatus: (typeof CONNECTION_STATUS)[keyof typeof CONNECTION_STATUS] =
		CONNECTION_STATUS.DISCONNECTED;
	private connectionPromise: Promise<void> | null = null;

	constructor(options: DaprConnectionOptions = {}) {
		// Initialize from options or environment variables
		this.daprHost =
			options.daprHost || process.env[ENV_DAPR_HOST] || DEFAULT_DAPR_HOST;
		this.daprPort =
			options.daprPort || process.env[ENV_DAPR_HTTP_PORT] || DEFAULT_DAPR_PORT;
		this.communicationProtocol =
			options.communicationProtocol || CommunicationProtocolEnum.HTTP;
		this.maxBodySizeMb = options.maxBodySizeMb || DEFAULT_MAX_BODY_SIZE_MB;
		this.daprApiToken = options.daprApiToken || process.env[ENV_DAPR_API_TOKEN];
		this.logger = options.logger || createDefaultLogger();

		this.logger.info("DaprConnectionManager initialized", {
			daprHost: this.daprHost,
			daprPort: this.daprPort,
			communicationProtocol: this.communicationProtocol,
		});
	}

	/**
	 * Get the current Dapr client instance
	 * If not connected, it will connect automatically
	 */
	public async getClient(): Promise<DaprClient> {
		if (!this.client || this.connectionStatus !== CONNECTION_STATUS.CONNECTED) {
			await this.connect();
		}

		if (!this.client) {
			throw createConnectionError("Not connected to Dapr sidecar");
		}

		return this.client;
	}

	/**
	 * Connect to Dapr sidecar
	 */
	public async connect(): Promise<void> {
		// If already connecting, return the existing promise
		if (this.connectionPromise) {
			return this.connectionPromise;
		}

		// If already connected, return immediately
		if (this.client && this.connectionStatus === CONNECTION_STATUS.CONNECTED) {
			return Promise.resolve();
		}

		// Set status to connecting
		this.connectionStatus = CONNECTION_STATUS.CONNECTING;

		// Create a new connection promise
		this.connectionPromise = this.establishConnection();

		try {
			await this.connectionPromise;
			this.connectionStatus = CONNECTION_STATUS.CONNECTED;
		} catch (error) {
			this.connectionStatus = CONNECTION_STATUS.ERROR;
			throw error;
		} finally {
			this.connectionPromise = null;
		}
	}

	/**
	 * Establish connection to Dapr sidecar
	 */
	private async establishConnection(): Promise<void> {
		try {
			this.logger.info("Connecting to Dapr sidecar", {
				daprHost: this.daprHost,
				daprPort: this.daprPort,
				protocol: this.communicationProtocol,
			});

			// Determine if we should include host/port based on environment variables
			const useEndpointFromEnv =
				(process.env[ENV_DAPR_HTTP_ENDPOINT] &&
					this.communicationProtocol === CommunicationProtocolEnum.HTTP) ||
				(process.env[ENV_DAPR_GRPC_ENDPOINT] &&
					this.communicationProtocol === CommunicationProtocolEnum.GRPC);

			// Create client options with only the properties we need
			// biome-ignore lint/suspicious/noExplicitAny: Required for DaprClient compatibility
			const clientOptions: Record<string, any> = {
				communicationProtocol: this.communicationProtocol,
				maxBodySizeMb: this.maxBodySizeMb,
			};

			// Only include host/port if we're not using environment endpoint
			if (!useEndpointFromEnv) {
				clientOptions.daprHost = this.daprHost;
				clientOptions.daprPort = this.daprPort;
			}

			// Add API token if available
			if (this.daprApiToken) {
				clientOptions.daprApiToken = this.daprApiToken;
			}

			// Create a new DaprClient instance with timeout
			await withTimeout(
				async () => {
					this.client = new DaprClient(clientOptions);
				},
				DEFAULT_CONNECTION_TIMEOUT_MS,
				"Connection to Dapr sidecar timed out",
			);

			// Test the connection with a health check
			await this.healthCheck();

			this.logger.info("Successfully connected to Dapr sidecar");
		} catch (error) {
			this.logger.error("Failed to connect to Dapr sidecar", error);
			this.client = null;
			throw createConnectionError(
				`Failed to connect to Dapr sidecar at ${this.daprHost}:${this.daprPort}`,
				error,
			);
		}
	}

	/**
	 * Disconnect from Dapr sidecar
	 */
	public async disconnect(): Promise<void> {
		if (!this.client) {
			return;
		}

		try {
			this.logger.info("Disconnecting from Dapr sidecar");

			// DaprClient doesn't have an explicit disconnect method
			// We'll just clear the client reference
			this.client = null;
			this.connectionStatus = CONNECTION_STATUS.DISCONNECTED;

			this.logger.info("Disconnected from Dapr sidecar");
		} catch (error) {
			this.logger.error("Error during disconnect", error);
			throw createConnectionError(
				"Failed to disconnect from Dapr sidecar",
				error,
			);
		}
	}

	/**
	 * Check if connected to Dapr sidecar
	 */
	public isConnected(): boolean {
		return (
			this.client !== null &&
			this.connectionStatus === CONNECTION_STATUS.CONNECTED
		);
	}

	/**
	 * Get connection status
	 */
	public getConnectionStatus(): string {
		return this.connectionStatus;
	}

	/**
	 * Perform a health check on the Dapr sidecar
	 */
	public async healthCheck(): Promise<HealthStatus> {
		if (!this.client) {
			throw createConnectionError("Not connected to Dapr sidecar");
		}

		try {
			return await withTimeout(
				async () => {
					// Use the client's health endpoint
					if (!this.client) {
						throw createConnectionError("Not connected to Dapr sidecar");
					}
					const response = (await this.client.invoker.invoke(
						"healthz",
						"healthz",
						HttpMethod.GET,
					)) as { status: number; headers?: Record<string, string> };

					return {
						status:
							response.status === 204
								? HEALTH_STATUS.HEALTHY
								: HEALTH_STATUS.UNHEALTHY,
						version: response.headers?.["dapr-version"] || "unknown",
					};
				},
				DEFAULT_HEALTH_CHECK_TIMEOUT_MS,
				"Health check timed out",
			);
		} catch (error) {
			this.logger.error("Health check failed", error);
			return {
				status: HEALTH_STATUS.UNHEALTHY,
				version: "unknown",
			};
		}
	}

	/**
	 * Get the Dapr client configuration
	 */

	// biome-ignore lint/suspicious/noExplicitAny: <>
	public getClientConfig(): Record<string, any> {
		return {
			daprHost: this.daprHost,
			daprPort: this.daprPort,
			communicationProtocol: this.communicationProtocol,
			maxBodySizeMb: this.maxBodySizeMb,
			hasApiToken: !!this.daprApiToken,
			connectionStatus: this.connectionStatus,
		};
	}
}
