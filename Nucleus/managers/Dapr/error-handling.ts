/**
 * Error handling utilities for the Dapr manager
 */

import { ERROR_CODES } from "./constants";
import type { DaprError } from "./types";

export class DaprManagerError extends Error {
	code: string;
	details?: unknown;

	constructor(code: string, message: string, details?: unknown) {
		super(message);
		this.name = "DaprManagerError";
		this.code = code;
		this.details = details;
	}

	toJSON(): DaprError {
		return {
			code: this.code,
			message: this.message,
			details: this.details,
		};
	}
}

export const createConnectionError = (
	message: string,
	details?: unknown,
): DaprManagerError =>
	new DaprManagerError(ERROR_CODES.CONNECTION_ERROR, message, details);

export const createTimeoutError = (
	message: string,
	details?: unknown,
): DaprManagerError =>
	new DaprManagerError(ERROR_CODES.TIMEOUT_ERROR, message, details);

export const createStateError = (
	message: string,
	details?: unknown,
): DaprManagerError =>
	new DaprManagerError(ERROR_CODES.STATE_ERROR, message, details);

export const createPubSubError = (
	message: string,
	details?: unknown,
): DaprManagerError =>
	new DaprManagerError(ERROR_CODES.PUBSUB_ERROR, message, details);

export const createBindingError = (
	message: string,
	details?: unknown,
): DaprManagerError =>
	new DaprManagerError(ERROR_CODES.BINDING_ERROR, message, details);

export const createSecretError = (
	message: string,
	details?: unknown,
): DaprManagerError =>
	new DaprManagerError(ERROR_CODES.SECRET_ERROR, message, details);

export const createConfigError = (
	message: string,
	details?: unknown,
): DaprManagerError =>
	new DaprManagerError(ERROR_CODES.CONFIG_ERROR, message, details);

export const createInvokeError = (
	message: string,
	details?: unknown,
): DaprManagerError =>
	new DaprManagerError(ERROR_CODES.INVOKE_ERROR, message, details);

export const createCryptoError = (
	message: string,
	details?: unknown,
): DaprManagerError =>
	new DaprManagerError(ERROR_CODES.CRYPTO_ERROR, message, details);

export const createLockError = (
	message: string,
	details?: unknown,
): DaprManagerError =>
	new DaprManagerError(ERROR_CODES.LOCK_ERROR, message, details);

export const createWorkflowError = (
	message: string,
	details?: unknown,
): DaprManagerError =>
	new DaprManagerError(ERROR_CODES.WORKFLOW_ERROR, message, details);

export const createValidationError = (
	message: string,
	details?: unknown,
): DaprManagerError =>
	new DaprManagerError(ERROR_CODES.VALIDATION_ERROR, message, details);

/**
 * Safely handle errors from Dapr client operations
 * @param operation - Function to execute
 * @param errorCreator - Function to create an error if the operation fails
 */
export const safeExecute = async <T>(
	operation: () => Promise<T>,
	errorCreator: (message: string, details?: unknown) => DaprManagerError,
): Promise<T> => {
	try {
		return await operation();
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		throw errorCreator(errorMessage, error);
	}
};
