/**
 * Distributed lock client for Dapr
 */

import type { DaprClient } from "@dapr/dapr";
import { LockStatus } from "@dapr/dapr/types/lock/UnlockResponse";
import { createLockError, safeExecute } from "../error-handling";
import type {
	DaprLogger,
	LockOptions,
	LockResponse,
	UnlockResponse,
} from "../types";
import { validateRequired } from "../utils";

export class DaprLockClient {
	private client: () => Promise<DaprClient>;
	private logger: DaprLogger;

	constructor(clientProvider: () => Promise<DaprClient>, logger: DaprLogger) {
		this.client = clientProvider;
		this.logger = logger;
	}

	/**
	 * Try to acquire a lock
	 */
	public async lock(
		storeName: string,
		resourceId: string,
		lockOwner: string,
		options: LockOptions,
	): Promise<LockResponse> {
		validateRequired(
			{
				storeName,
				resourceId,
				lockOwner,
				expiryInSeconds: options.expiryInSeconds,
			},
			["storeName", "resourceId", "lockOwner", "expiryInSeconds"],
			"lock",
		);

		return safeExecute(
			async () => {
				this.logger.debug("Acquiring lock", {
					storeName,
					resourceId,
					lockOwner,
				});
				const client = await this.client();

				const response = await client.lock.lock(
					storeName,
					resourceId,
					lockOwner,
					options.expiryInSeconds,
				);

				this.logger.debug("Lock acquisition result", {
					storeName,
					resourceId,
					lockOwner,
					success: response.success,
				});

				return {
					success: response.success,
				};
			},
			(message, details) =>
				createLockError(
					`Failed to acquire lock for resource ${resourceId}: ${message}`,
					details,
				),
		);
	}

	/**
	 * Release a previously acquired lock
	 */
	public async unlock(
		storeName: string,
		resourceId: string,
		lockOwner: string,
	): Promise<UnlockResponse> {
		validateRequired(
			{ storeName, resourceId, lockOwner },
			["storeName", "resourceId", "lockOwner"],
			"unlock",
		);

		return safeExecute(
			async () => {
				this.logger.debug("Releasing lock", {
					storeName,
					resourceId,
					lockOwner,
				});
				const client = await this.client();

				const response = await client.lock.unlock(
					storeName,
					resourceId,
					lockOwner,
				);

				this.logger.debug("Lock release result", {
					storeName,
					resourceId,
					lockOwner,
					status: this.getLockStatusName(response.status),
				});

				return {
					status: response.status,
				};
			},
			(message, details) =>
				createLockError(
					`Failed to release lock for resource ${resourceId}: ${message}`,
					details,
				),
		);
	}

	/**
	 * Get a readable name for a lock status code
	 */
	private getLockStatusName(status: LockStatus): string {
		switch (status) {
			case LockStatus.Success:
				return "Success";
			case LockStatus.LockDoesNotExist:
				return "LockDoesNotExist";
			case LockStatus.LockBelongsToOthers:
				return "LockBelongsToOthers";
			default:
				return "InternalError";
		}
	}
}
