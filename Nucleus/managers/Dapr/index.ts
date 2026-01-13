/**
 * Main Dapr manager that integrates all clients
 */
/** biome-ignore-all lint/correctness/noUnusedPrivateClassMembers: <> */

import type { DaprClient } from "@dapr/dapr";
import { DaprBindingClient } from "./clients/binding-client";
import { DaprConfigClient } from "./clients/config-client";
import { DaprCryptoClient } from "./clients/crypto-client";
import { DaprInvokeClient } from "./clients/invoke-client";
import { DaprLockClient } from "./clients/lock-client";
import { DaprPubSubClient } from "./clients/pubsub-client";
import { DaprSecretClient } from "./clients/secret-client";
import { DaprStateClient } from "./clients/state-client";
import { DaprWorkflowClient } from "./clients/workflow-client";
import { DaprConnectionManager } from "./connection-manager";
import type { DaprConnectionOptions, DaprLogger, HealthStatus } from "./types";
import { createDefaultLogger } from "./utils";

export class DaprManager {
	private connectionManager: DaprConnectionManager;
	private logger: DaprLogger;

	// Client instances
	private _state: DaprStateClient;
	private _pubsub: DaprPubSubClient;
	private _binding: DaprBindingClient;
	private _secret: DaprSecretClient;
	private _config: DaprConfigClient;
	private _invoke: DaprInvokeClient;
	private _lock: DaprLockClient;
	private _crypto: DaprCryptoClient;
	private _workflow: DaprWorkflowClient;

	constructor(options: DaprConnectionOptions = {}) {
		this.logger = options.logger || createDefaultLogger();
		this.connectionManager = new DaprConnectionManager(options);

		// Create client provider function
		const clientProvider = async (): Promise<DaprClient> => {
			return this.connectionManager.getClient();
		};

		// Initialize all clients
		this._state = new DaprStateClient(clientProvider, this.logger);
		this._pubsub = new DaprPubSubClient(clientProvider, this.logger);
		this._binding = new DaprBindingClient(clientProvider, this.logger);
		this._secret = new DaprSecretClient(clientProvider, this.logger);
		this._config = new DaprConfigClient(clientProvider, this.logger);
		this._invoke = new DaprInvokeClient(clientProvider, this.logger);
		this._lock = new DaprLockClient(clientProvider, this.logger);
		this._crypto = new DaprCryptoClient(clientProvider, this.logger);
		this._workflow = new DaprWorkflowClient(clientProvider, this.logger);
	}

	/**
	 * Connect to Dapr sidecar
	 */
	public async connect(): Promise<void> {
		await this.connectionManager.connect();
	}

	/**
	 * Disconnect from Dapr sidecar
	 */
	public async disconnect(): Promise<void> {
		await this.connectionManager.disconnect();
	}

	/**
	 * Check if connected to Dapr sidecar
	 */
	public isConnected(): boolean {
		return this.connectionManager.isConnected();
	}

	/**
	 * Get connection status
	 */
	public getConnectionStatus(): string {
		return this.connectionManager.getConnectionStatus();
	}

	/**
	 * Perform a health check on the Dapr sidecar
	 */
	public async healthCheck(): Promise<HealthStatus> {
		return this.connectionManager.healthCheck();
	}

	/**
	 * Get the Dapr client configuration
	 */

	// biome-ignore lint/suspicious/noExplicitAny: <>
	public getClientConfig(): Record<string, any> {
		return this.connectionManager.getClientConfig();
	}

	/**
	 * Access the state management client
	 */
	public get state(): DaprStateClient {
		return this._state;
	}

	/**
	 * Access the pubsub client
	 */
	public get pubsub(): DaprPubSubClient {
		return this._pubsub;
	}

	/**
	 * Access the binding client
	 */
	public get binding(): DaprBindingClient {
		return this._binding;
	}

	/**
	 * Access the secret client
	 */
	public get secret(): DaprSecretClient {
		return this._secret;
	}

	/**
	 * Access the configuration client
	 */
	public get config(): DaprConfigClient {
		return this._config;
	}

	/**
	 * Access the service invocation client
	 */
	public get invoke(): DaprInvokeClient {
		return this._invoke;
	}

	/**
	 * Access the distributed lock client
	 */
	public get lock(): DaprLockClient {
		return this._lock;
	}

	/**
	 * Access the cryptography client
	 */
	public get crypto(): DaprCryptoClient {
		return this._crypto;
	}

	/**
	 * Access the workflow client
	 */
	public get workflow(): DaprWorkflowClient {
		return this._workflow;
	}
}

// Create and export a singleton instance
export const daprManager = new DaprManager();

export { DaprBindingClient } from "./clients/binding-client";
export { DaprConfigClient } from "./clients/config-client";
export { DaprCryptoClient } from "./clients/crypto-client";
export { DaprInvokeClient } from "./clients/invoke-client";
export { DaprLockClient } from "./clients/lock-client";
export { DaprPubSubClient } from "./clients/pubsub-client";
export { DaprSecretClient } from "./clients/secret-client";
// Export individual clients for direct usage if needed
export { DaprStateClient } from "./clients/state-client";
export { DaprWorkflowClient } from "./clients/workflow-client";
export * from "./constants";
export * from "./error-handling";
// Export all types
export * from "./types";
