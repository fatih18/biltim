/** biome-ignore-all lint/suspicious/noExplicitAny: <> */
import { CommunicationProtocolEnum, DaprClient, HttpMethod } from "@dapr/dapr";
import type { StateQueryType } from "@dapr/dapr/types/state/StateQuery.type";

export class DaprConnectionManager {
	private client: DaprClient;
	private daprHost: string;
	private daprPort: string;

	constructor() {
		this.daprHost = process.env.DAPR_HOST || "127.0.0.1";
		this.daprPort = process.env.DAPR_HTTP_PORT || "3500";

		// Initialize the client
		this.client = new DaprClient({
			daprHost: this.daprHost,
			daprPort: this.daprPort,
			communicationProtocol: CommunicationProtocolEnum.HTTP,
		});

		console.log(`✅ Created new DaprConnectionManager instance`);
	}

	/**
	 * Connect to Dapr (reinitialize client)
	 */
	public async connect(): Promise<void> {
		try {
			console.log(
				`🔄 Connecting to Dapr sidecar at ${this.daprHost}:${this.daprPort}...`,
			);

			// Create a new DaprClient instance
			this.client = new DaprClient({
				daprHost: this.daprHost,
				daprPort: this.daprPort,
				communicationProtocol: CommunicationProtocolEnum.HTTP,
			});

			// Test the connection
			await this.healthCheck();

			console.log(`✅ Successfully connected to Dapr sidecar`);
		} catch (error) {
			console.error(`❌ Failed to connect to Dapr: ${error}`);
			throw error;
		}
	}

	/**
	 * Disconnect from Dapr
	 */
	public async disconnect(): Promise<void> {
		try {
			console.log(`🔌 Disconnecting from Dapr sidecar...`);
			// Note: DaprClient doesn't have an explicit disconnect method
			// We'll recreate the client on next connect call
			console.log(`✅ Disconnected from Dapr sidecar`);
		} catch (error) {
			console.error(`❌ Error during disconnect: ${error}`);
		}
	}

	/**
	 * Check if connected to Dapr
	 */
	public async isConnected(): Promise<boolean> {
		try {
			const health = await this.healthCheck();
			return health.status === "healthy";
		} catch (_error) {
			return false;
		}
	}

	// ==================== STATE MANAGEMENT ====================

	/**
	 * Save state
	 */
	public async addState(
		key: string,
		value: any,
		storeName = "statestore-redis",
	): Promise<any> {
		return this.client.state.save(storeName, [{ key, value }]);
	}

	/**
	 * Update state (alias for addState since Dapr treats them the same)
	 */
	public async updateState(
		key: string,
		value: any,
		storeName = "statestore-redis",
	): Promise<any> {
		return this.client.state.save(storeName, [{ key, value }]);
	}

	/**
	 * Get state by key
	 */
	public async getState(
		key: string,
		storeName = "statestore-redis",
	): Promise<any> {
		return this.client.state.get(storeName, key);
	}

	/**
	 * Delete state
	 */
	public async deleteState(
		key: string,
		storeName = "statestore-redis",
	): Promise<any> {
		return this.client.state.delete(storeName, key);
	}

	/**
	 * Query states
	 */
	public async queryStates(
		query: StateQueryType,
		storeName = "statestore",
	): Promise<any> {
		return this.client.state.query(storeName, query);
	}

	/**
	 * Get multiple states
	 */
	public async getBulkState(
		keys: string[],
		storeName = "statestore",
	): Promise<any> {
		return this.client.state.getBulk(storeName, keys);
	}

	/**
	 * Execute state transaction
	 */
	public async stateTransaction(
		operations: any[],
		storeName = "statestore",
	): Promise<any> {
		return this.client.state.transaction(storeName, operations);
	}

	// ==================== CONFIGURATION ====================

	/**
	 * Get configuration
	 */
	public async getConfig(
		keys: string[],
		storeName = "configstore",
	): Promise<any> {
		return this.client.configuration.get(storeName, keys);
	}

	// ==================== PUBSUB ====================

	/**
	 * Publish message
	 */
	public async publishMessage(
		pubsubName: string,
		topicName: string,
		data: any,
		options?: { contentType?: string; metadata?: Record<string, string> },
	): Promise<any> {
		return this.client.pubsub.publish(
			pubsubName,
			topicName,
			data,
			options?.metadata,
		);
	}

	// ==================== SERVICE INVOCATION ====================

	/**
	 * Invoke another service
	 */
	public async invokeService(
		appId: string,
		methodName: string,
		httpMethod: HttpMethod = HttpMethod.POST,
		data?: any,
		options?: { headers?: Record<string, string> },
	): Promise<any> {
		return this.client.invoker.invoke(
			appId,
			methodName,
			httpMethod,
			data,
			options?.headers,
		);
	}

	// ==================== SECRETS ====================

	/**
	 * Get secret
	 */
	public async getSecret(
		storeName: string,
		key: string,
		metadata?: Record<string, string>,
	): Promise<any> {
		// Convert metadata to a metadata string if provided, as required by the Dapr client
		const metadataStr = metadata ? JSON.stringify(metadata) : undefined;
		return this.client.secret.get(storeName, key, metadataStr);
	}

	/**
	 * Get bulk secrets
	 */
	public async getBulkSecrets(
		storeName: string,
		_metadata?: Record<string, string>,
	): Promise<any> {
		// Note: The Dapr client's getBulk method only accepts the storeName parameter
		// Metadata is not supported for bulk secret retrieval in the Dapr JS SDK
		return this.client.secret.getBulk(storeName);
	}

	// ==================== BINDINGS ====================

	/**
	 * Invoke binding
	 */
	public async invokeBinding(
		name: string,
		operation: string,
		data?: any,
		metadata?: Record<string, string>,
	): Promise<any> {
		return this.client.binding.send(name, operation, data, metadata);
	}

	// ==================== HEALTH CHECK ====================

	/**
	 * Perform health check by making a simple state call
	 */
	public async healthCheck(): Promise<{ status: string; timestamp: string }> {
		try {
			// Simple health check - try to get a non-existent key
			await this.client.state.get("statestore", "__health_check__");

			return {
				status: "healthy",
				timestamp: new Date().toISOString(),
			};
		} catch (_error) {
			return {
				status: "unhealthy",
				timestamp: new Date().toISOString(),
			};
		}
	}

	/**
	 * Test connection with comprehensive checks
	 * Performs multiple operations to verify Dapr functionality
	 */
	public async testConnection(): Promise<{
		success: boolean;
		operations: Record<string, boolean>;
		error?: string;
	}> {
		const results: Record<string, boolean> = {};
		let success = true;
		let _error: string | undefined;

		try {
			// Test 1: State operation
			try {
				const testKey = `__test_${Date.now()}`;
				await this.addState(testKey, { test: true });
				const result = await this.getState(testKey);
				results.state = result && result.test === true;
				await this.deleteState(testKey);
			} catch (_e) {
				results.state = false;
				success = false;
			}

			// Test 2: Health check
			try {
				const health = await this.healthCheck();
				results.health = health.status === "healthy";
				if (!results.health) success = false;
			} catch (_e) {
				results.health = false;
				success = false;
			}

			// Test 3: Configuration (if available)
			try {
				await this.getConfig(["test"]);
				results.config = true;
			} catch (_e) {
				// Config might not be available, so don't fail the overall test
				results.config = false;
			}

			return {
				success,
				operations: results,
			};
		} catch (e) {
			const errorMessage = e instanceof Error ? e.message : String(e);
			return {
				success: false,
				operations: results,
				error: errorMessage,
			};
		}
	}

	// ==================== DISTRIBUTED LOCKS ====================

	/**
	 * Try to acquire a lock
	 */
	public async tryLock(
		storeName: string,
		resourceId: string,
		lockOwner: string,
		expiryInSeconds = 60,
	): Promise<{ success: boolean }> {
		try {
			// In Dapr JS SDK 3.5.2, the method is named 'lock' not 'tryLock'
			const response = await this.client.lock.lock(
				storeName,
				resourceId,
				lockOwner,
				expiryInSeconds,
			);
			// Handle the response based on the actual return type
			return { success: Boolean(response) };
		} catch (error) {
			console.error(`Failed to acquire lock: ${error}`);
			return { success: false };
		}
	}

	/**
	 * Release a lock
	 */
	public async unlock(
		storeName: string,
		resourceId: string,
		lockOwner: string,
	): Promise<{ success: boolean }> {
		try {
			const response = await this.client.lock.unlock(
				storeName,
				resourceId,
				lockOwner,
			);
			// Handle the response based on the actual return type
			return { success: Boolean(response) };
		} catch (error) {
			console.error(`Failed to release lock: ${error}`);
			return { success: false };
		}
	}

	// ==================== CRYPTOGRAPHY ====================

	/**
	 * Encrypt data using Dapr crypto
	 */
	public async encrypt(
		componentName: string,
		keyName: string,
		data: Uint8Array,
	): Promise<Uint8Array> {
		try {
			// Using a direct approach with the crypto client
			// Following the Dapr JS SDK pattern with proper parameters
			// @ts-expect-error - The Dapr JS SDK types may not match our usage
			return await this.client.crypto.encrypt(data, {
				componentName,
				keyName,
			});
		} catch (error) {
			console.error(`Encryption failed: ${error}`);
			throw error;
		}
	}

	/**
	 * Decrypt data using Dapr crypto
	 */
	public async decrypt(
		componentName: string,
		keyName: string,
		ciphertext: Uint8Array,
	): Promise<Uint8Array> {
		try {
			// Using a direct approach with the crypto client
			// Following the Dapr JS SDK pattern with proper parameters
			return await this.client.crypto.decrypt(ciphertext, {
				componentName,
				keyName,
			});
		} catch (error) {
			console.error(`Decryption failed: ${error}`);
			throw error;
		}
	}

	// ==================== WORKFLOWS ====================

	/**
	 * Start a new workflow
	 */
	public async startWorkflow(
		workflowComponent: string,
		workflowName: string,
		options?: {
			instanceID?: string;
			input?: any;
		},
	): Promise<{ instanceID: string }> {
		try {
			// In Dapr JS SDK 3.5.2, the workflow API returns the instanceID directly
			const instanceID = await this.client.workflow.start(
				workflowComponent,
				workflowName,
				options?.input,
			);
			return { instanceID };
		} catch (error) {
			console.error(`Failed to start workflow: ${error}`);
			throw error;
		}
	}

	/**
	 * Get workflow metadata
	 */
	public async getWorkflow(workflowComponent: string): Promise<any> {
		try {
			return await this.client.workflow.get(workflowComponent);
		} catch (error) {
			console.error(`Failed to get workflow: ${error}`);
			throw error;
		}
	}

	/**
	 * Terminate a workflow
	 */
	public async terminateWorkflow(workflowComponent: string): Promise<void> {
		try {
			await this.client.workflow.terminate(workflowComponent);
		} catch (error) {
			console.error(`Failed to terminate workflow: ${error}`);
			throw error;
		}
	}

	/**
	 * Pause a workflow
	 */
	public async pauseWorkflow(workflowComponent: string): Promise<void> {
		try {
			await this.client.workflow.pause(workflowComponent);
		} catch (error) {
			console.error(`Failed to pause workflow: ${error}`);
			throw error;
		}
	}

	/**
	 * Resume a workflow
	 */
	public async resumeWorkflow(workflowComponent: string): Promise<void> {
		try {
			await this.client.workflow.resume(workflowComponent);
		} catch (error) {
			console.error(`Failed to resume workflow: ${error}`);
			throw error;
		}
	}

	/**
	 * Raise a workflow event
	 */
	public async raiseWorkflowEvent(
		_workflowComponent: string,
		instanceID: string,
		eventName: string,
		eventData?: any,
	): Promise<void> {
		try {
			// In Dapr JS SDK 3.5.2, the method is named 'raise' not 'raiseEvent'
			await this.client.workflow.raise(instanceID, eventName, eventData);
		} catch (error) {
			console.error(`Failed to raise workflow event: ${error}`);
			throw error;
		}
	}

	/**
	 * Purge workflow
	 */
	public async purgeWorkflow(workflowComponent: string): Promise<void> {
		try {
			await this.client.workflow.purge(workflowComponent);
		} catch (error) {
			console.error(`Failed to purge workflow: ${error}`);
			throw error;
		}
	}
}

// Create and export a singleton instance
export const daprService = new DaprConnectionManager();
