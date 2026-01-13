/**
 * State management client for Dapr
 */

import type { DaprClient } from "@dapr/dapr";
import type { StateQueryType } from "@dapr/dapr/types/state/StateQuery.type";
import { DEFAULT_STATE_STORE } from "../constants";
import { createStateError, safeExecute } from "../error-handling";
import type {
	DaprLogger,
	StateItem,
	StateOperation,
	StateSaveOptions,
} from "../types";
import { validateRequired } from "../utils";

export class DaprStateClient {
	private client: () => Promise<DaprClient>;
	private logger: DaprLogger;

	constructor(clientProvider: () => Promise<DaprClient>, logger: DaprLogger) {
		this.client = clientProvider;
		this.logger = logger;
	}

	/**
	 * Save state items
	 */
	public async save<T = unknown>(
		stateItems: StateItem<T>[],
		options: StateSaveOptions = {},
		storeName = DEFAULT_STATE_STORE,
	): Promise<void> {
		validateRequired(
			{ stateItems, storeName },
			["stateItems", "storeName"],
			"state save",
		);

		if (stateItems.length === 0) {
			return;
		}

		return safeExecute(
			async () => {
				this.logger.debug("Saving state items", {
					count: stateItems.length,
					storeName,
				});
				const client = await this.client();
				await client.state.save(storeName, stateItems, options);
				this.logger.debug("State items saved successfully", {
					count: stateItems.length,
					storeName,
				});
			},
			(message, details) =>
				createStateError(`Failed to save state items: ${message}`, details),
		);
	}

	/**
	 * Get a state item by key
	 */
	public async get<T = unknown>(
		key: string,
		storeName = DEFAULT_STATE_STORE,
	): Promise<T | undefined> {
		validateRequired({ key, storeName }, ["key", "storeName"], "state get");

		return safeExecute(
			async () => {
				this.logger.debug("Getting state item", { key, storeName });
				const client = await this.client();
				const result = await client.state.get(storeName, key);
				this.logger.debug("State item retrieved", {
					key,
					storeName,
					found: result !== undefined,
				});

				// Handle the different return types from Dapr SDK
				if (result === undefined || result === null) {
					return undefined;
				}

				// If it's a string, try to parse it as JSON, otherwise return as is (with type assertion)
				if (typeof result === "string") {
					try {
						return JSON.parse(result) as T;
					} catch {
						return result as unknown as T;
					}
				}

				// If it's a KeyValueType object with data property
				if (typeof result === "object") {
					return result as unknown as T;
				}

				return result as unknown as T;
			},
			(message, details) =>
				createStateError(
					`Failed to get state item ${key}: ${message}`,
					details,
				),
		);
	}

	/**
	 * Get multiple state items by keys
	 */
	public async getBulk<T = unknown>(
		keys: string[],
		storeName = DEFAULT_STATE_STORE,
	): Promise<Record<string, T>> {
		validateRequired(
			{ keys, storeName },
			["keys", "storeName"],
			"state getBulk",
		);

		if (keys.length === 0) {
			return {};
		}

		return safeExecute(
			async () => {
				this.logger.debug("Getting bulk state items", {
					count: keys.length,
					storeName,
				});
				const client = await this.client();
				const results = await client.state.getBulk(storeName, keys);

				// Convert array response to a key-value object for easier access
				const resultMap: Record<string, T> = {};
				results.forEach((item) => {
					if (item.data !== undefined) {
						// Convert the data to the expected type T
						resultMap[item.key] = item.data as unknown as T;
					}
				});

				this.logger.debug("Bulk state items retrieved", {
					count: keys.length,
					found: Object.keys(resultMap).length,
					storeName,
				});

				return resultMap;
			},
			(message, details) =>
				createStateError(`Failed to get bulk state items: ${message}`, details),
		);
	}

	/**
	 * Delete a state item by key
	 */
	public async delete(
		key: string,
		etag?: string,
		metadata?: Record<string, string>,
		storeName = DEFAULT_STATE_STORE,
	): Promise<void> {
		validateRequired({ key, storeName }, ["key", "storeName"], "state delete");

		return safeExecute(
			async () => {
				this.logger.debug("Deleting state item", { key, storeName });
				const client = await this.client();

				// Construct options object for delete method
				const options: { etag?: string; metadata?: Record<string, string> } =
					{};
				if (etag) {
					options.etag = etag;
				}
				if (metadata) {
					options.metadata = metadata;
				}

				await client.state.delete(storeName, key, options);
				this.logger.debug("State item deleted", { key, storeName });
			},
			(message, details) =>
				createStateError(
					`Failed to delete state item ${key}: ${message}`,
					details,
				),
		);
	}

	/**
	 * Execute state transactions
	 */
	public async transaction<T = unknown>(
		operations: StateOperation<T>[],
		storeName = DEFAULT_STATE_STORE,
	): Promise<void> {
		validateRequired(
			{ operations, storeName },
			["operations", "storeName"],
			"state transaction",
		);

		if (operations.length === 0) {
			return;
		}

		return safeExecute(
			async () => {
				this.logger.debug("Executing state transaction", {
					operationCount: operations.length,
					storeName,
				});

				const client = await this.client();

				// Convert StateOperation to OperationType by transforming etag string to IEtag object
				const daprOperations = operations.map((op) => ({
					operation: op.operation,
					request: {
						key: op.request.key,
						value: op.request.value,
						etag: op.request.etag ? { value: op.request.etag } : undefined,
						metadata: op.request.metadata,
					},
				}));

				await client.state.transaction(storeName, daprOperations);

				this.logger.debug("State transaction executed successfully", {
					operationCount: operations.length,
					storeName,
				});
			},
			(message, details) =>
				createStateError(
					`Failed to execute state transaction: ${message}`,
					details,
				),
		);
	}

	/**
	 * Query state store
	 */
	public async query<T = unknown>(
		query: StateQueryType,
		storeName = DEFAULT_STATE_STORE,
	): Promise<T[]> {
		validateRequired(
			{ query, storeName },
			["query", "storeName"],
			"state query",
		);

		return safeExecute(
			async () => {
				this.logger.debug("Querying state store", { storeName });
				const client = await this.client();
				const result = await client.state.query(storeName, query);
				this.logger.debug("State query executed", {
					storeName,
					resultCount: result.results?.length || 0,
				});

				// Convert StateQueryResponseResult[] to T[]
				return (result.results || []).map((item) => item.data as T);
			},
			(message, details) =>
				createStateError(`Failed to query state store: ${message}`, details),
		);
	}

	/**
	 * Save a single state item (convenience method)
	 */
	public async saveItem<T = unknown>(
		key: string,
		value: T,
		options: StateSaveOptions = {},
		storeName = DEFAULT_STATE_STORE,
	): Promise<void> {
		const stateItem: StateItem<T> = { key, value };
		return this.save<T>([stateItem], options, storeName);
	}

	/**
	 * Update a state item if it exists, otherwise create it
	 */
	public async upsert<T = unknown>(
		key: string,
		value: T,
		options: StateSaveOptions = {},
		storeName = DEFAULT_STATE_STORE,
	): Promise<void> {
		return this.saveItem(key, value, options, storeName);
	}
}
