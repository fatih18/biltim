/**
 * Utility functions for the Dapr manager
 */
/** biome-ignore-all lint/suspicious/noExplicitAny: <> */

import {
	DEFAULT_RETRY_COUNT,
	DEFAULT_RETRY_DELAY_MS,
	DEFAULT_RETRY_JITTER,
	DEFAULT_RETRY_MAX_DELAY_MS,
} from "./constants";
import { createTimeoutError } from "./error-handling";
import type { DaprLogger, LogLevel } from "./types";

/**
 * Default logger implementation
 */
export const createDefaultLogger = (): DaprLogger => {
	const logWithLevel =
		(level: LogLevel) =>
		(message: string, ...meta: unknown[]) => {
			const timestamp = new Date().toISOString();
			const metaString = meta.length > 0 ? ` ${JSON.stringify(meta)}` : "";

			// eslint-disable-next-line no-console
			console[level](
				`[${timestamp}] [Dapr] [${level.toUpperCase()}] ${message}${metaString}`,
			);
		};

	return {
		debug: logWithLevel("debug"),
		info: logWithLevel("info"),
		warn: logWithLevel("warn"),
		error: logWithLevel("error"),
	};
};

/**
 * Create a no-op logger that doesn't log anything
 */
export const createNoopLogger = (): DaprLogger => ({
	debug: () => {},
	info: () => {},
	warn: () => {},
	error: () => {},
});

/**
 * Retry a function with exponential backoff
 */
export const retryWithBackoff = async <T>(
	fn: () => Promise<T>,
	options: {
		retryCount?: number;
		initialDelayMs?: number;
		maxDelayMs?: number;
		jitter?: number;
		shouldRetry?: (error: unknown) => boolean;
	} = {},
): Promise<T> => {
	const {
		retryCount = DEFAULT_RETRY_COUNT,
		initialDelayMs = DEFAULT_RETRY_DELAY_MS,
		maxDelayMs = DEFAULT_RETRY_MAX_DELAY_MS,
		jitter = DEFAULT_RETRY_JITTER,
		shouldRetry = () => true,
	} = options;

	let lastError: unknown;

	for (let attempt = 0; attempt <= retryCount; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;

			if (attempt === retryCount || !shouldRetry(error)) {
				throw error;
			}

			// Calculate delay with exponential backoff and jitter
			const exponentialDelay = Math.min(
				initialDelayMs * 2 ** attempt,
				maxDelayMs,
			);

			// Add jitter to prevent thundering herd problem
			const jitterAmount = exponentialDelay * jitter;
			const delay =
				exponentialDelay + Math.random() * jitterAmount * 2 - jitterAmount;

			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	throw lastError;
};

/**
 * Execute a function with a timeout
 */
export const withTimeout = async <T>(
	fn: () => Promise<T>,
	timeoutMs: number,
	errorMessage = "Operation timed out",
): Promise<T> => {
	return Promise.race([
		fn(),
		new Promise<never>((_, reject) => {
			setTimeout(() => {
				reject(createTimeoutError(errorMessage));
			}, timeoutMs);
		}),
	]);
};

/**
 * Validate that required parameters are provided
 */
export const validateRequired = <T extends Record<string, unknown>>(
	params: T,
	requiredKeys: Array<keyof T>,
	entityName: string,
): void => {
	const missingKeys = requiredKeys.filter((key) => params[key] === undefined);

	if (missingKeys.length > 0) {
		throw new Error(
			`Missing required ${entityName} parameters: ${missingKeys.join(", ")}`,
		);
	}
};

/**
 * Safely parse JSON string
 */
export const safeJsonParse = <T>(jsonString: string, defaultValue: T): T => {
	try {
		return JSON.parse(jsonString) as T;
	} catch (error) {
		console.log("Error.30102025:  ", error);
		return defaultValue;
	}
};

/**
 * Create a memoized function that caches results
 */
export const memoize = <T extends (...args: any[]) => any>(
	fn: T,
	getKey: (...args: Parameters<T>) => string = (...args) =>
		JSON.stringify(args),
): T => {
	const cache = new Map<string, ReturnType<T>>();

	return ((...args: Parameters<T>): ReturnType<T> => {
		const key = getKey(...args);

		const res = cache.get(key);

		if (res) {
			return res;
		}

		const result = fn(...args);
		cache.set(key, result);
		return result;
	}) as T;
};

/**
 * Debounce a function
 */
export const debounce = <T extends (...args: any[]) => any>(
	fn: T,
	delayMs: number,
): ((...args: Parameters<T>) => void) => {
	let timeoutId: NodeJS.Timeout | undefined;

	return (...args: Parameters<T>): void => {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}

		timeoutId = setTimeout(() => {
			fn(...args);
		}, delayMs);
	};
};
