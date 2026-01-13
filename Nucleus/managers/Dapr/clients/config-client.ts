/**
 * Configuration client for Dapr
 */

import type { DaprClient } from "@dapr/dapr";
import { DEFAULT_CONFIG_STORE } from "../constants";
import { createConfigError, safeExecute } from "../error-handling";
import type {
	ConfigItem,
	ConfigResponse,
	ConfigSubscription,
	ConfigSubscriptionCallback,
	DaprLogger,
} from "../types";
import { validateRequired } from "../utils";

export class DaprConfigClient {
	private client: () => Promise<DaprClient>;
	private logger: DaprLogger;

	constructor(clientProvider: () => Promise<DaprClient>, logger: DaprLogger) {
		this.client = clientProvider;
		this.logger = logger;
	}

	/**
	 * Get configuration items by keys
	 */
	public async get(
		keys: string[],
		storeName = DEFAULT_CONFIG_STORE,
	): Promise<Record<string, ConfigItem>> {
		validateRequired({ keys, storeName }, ["keys", "storeName"], "config get");

		if (keys.length === 0) {
			return {};
		}

		return safeExecute(
			async () => {
				this.logger.debug("Getting configuration", { keys, storeName });
				const client = await this.client();
				const response = await client.configuration.get(storeName, keys);

				this.logger.debug("Configuration retrieved", {
					keys,
					storeName,
					itemCount: Object.keys(response.items || {}).length,
				});

				return response.items || {};
			},
			(message, details) =>
				createConfigError(`Failed to get configuration: ${message}`, details),
		);
	}

	/**
	 * Subscribe to configuration updates for specific keys
	 */
	public async subscribeWithKeys(
		keys: string[],
		callback: ConfigSubscriptionCallback,
		storeName = DEFAULT_CONFIG_STORE,
	): Promise<ConfigSubscription> {
		validateRequired(
			{ keys, callback, storeName },
			["keys", "callback", "storeName"],
			"config subscribeWithKeys",
		);

		if (keys.length === 0) {
			throw createConfigError(
				"At least one key must be provided for subscription",
			);
		}

		return safeExecute(
			async () => {
				this.logger.debug("Subscribing to configuration updates", {
					keys,
					storeName,
				});
				const client = await this.client();

				const stream = await client.configuration.subscribeWithKeys(
					storeName,
					keys,
					async (data: ConfigResponse) => {
						try {
							this.logger.debug("Received configuration update", {
								storeName,
								updatedKeys: Object.keys(data.items || {}),
							});

							await callback(data);
						} catch (error) {
							this.logger.error(
								"Error in configuration subscription callback",
								error,
							);
						}
					},
				);

				this.logger.debug("Configuration subscription established", {
					keys,
					storeName,
				});

				return {
					stop: () => {
						this.logger.debug("Stopping configuration subscription", {
							keys,
							storeName,
						});
						stream.stop();
					},
				};
			},
			(message, details) =>
				createConfigError(
					`Failed to subscribe to configuration updates: ${message}`,
					details,
				),
		);
	}

	/**
	 * Get a single configuration value by key
	 */
	public async getValue(
		key: string,
		storeName = DEFAULT_CONFIG_STORE,
	): Promise<string | undefined> {
		const items = await this.get([key], storeName);
		return items[key]?.value;
	}

	/**
	 * Get multiple configuration values as a simple key-value object
	 */
	public async getValues(
		keys: string[],
		storeName = DEFAULT_CONFIG_STORE,
	): Promise<Record<string, string>> {
		const items = await this.get(keys, storeName);

		const values: Record<string, string> = {};
		for (const key in items) {
			if (items[key]?.value !== undefined) {
				values[key] = items[key].value;
			}
		}

		return values;
	}
}
