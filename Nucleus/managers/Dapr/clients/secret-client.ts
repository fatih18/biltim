/**
 * Secret client for Dapr
 */

import type { DaprClient } from "@dapr/dapr";
import { DEFAULT_SECRET_STORE } from "../constants";
import { createSecretError, safeExecute } from "../error-handling";
import type { DaprLogger, SecretOptions } from "../types";
import { validateRequired } from "../utils";

export class DaprSecretClient {
	private client: () => Promise<DaprClient>;
	private logger: DaprLogger;

	constructor(clientProvider: () => Promise<DaprClient>, logger: DaprLogger) {
		this.client = clientProvider;
		this.logger = logger;
	}

	/**
	 * Get a secret by key
	 */
	public async get<T = string>(
		key: string,
		options: SecretOptions = {},
		storeName = DEFAULT_SECRET_STORE,
	): Promise<T> {
		validateRequired({ key, storeName }, ["key", "storeName"], "secret get");

		return safeExecute(
			async () => {
				this.logger.debug("Getting secret", { key, storeName });
				const client = await this.client();

				// Convert metadata to a string if provided, as required by the Dapr client
				const metadataStr = options.metadata
					? JSON.stringify(options.metadata)
					: undefined;

				const result = await client.secret.get(storeName, key, metadataStr);
				this.logger.debug("Secret retrieved", { key, storeName });

				return result as T;
			},
			(message, details) =>
				createSecretError(`Failed to get secret ${key}: ${message}`, details),
		);
	}

	/**
	 * Get all secrets in the store
	 */
	public async getBulk<T = Record<string, string>>(
		_options: SecretOptions = {},
		storeName = DEFAULT_SECRET_STORE,
	): Promise<T> {
		validateRequired({ storeName }, ["storeName"], "secret getBulk");

		return safeExecute(
			async () => {
				this.logger.debug("Getting all secrets", { storeName });
				const client = await this.client();

				// Note: The Dapr client's getBulk method only accepts the storeName parameter
				// Metadata is not supported for bulk secret retrieval in the Dapr JS SDK
				const result = await client.secret.getBulk(storeName);

				this.logger.debug("All secrets retrieved", {
					storeName,
					secretCount: Object.keys(result).length,
				});

				return result as T;
			},
			(message, details) =>
				createSecretError(`Failed to get all secrets: ${message}`, details),
		);
	}
}
