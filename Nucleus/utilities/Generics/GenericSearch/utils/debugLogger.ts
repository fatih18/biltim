import { DEBUG_MODE } from "../constants";

/**
 * Centralized debug logging utility
 */
export function debugLog(message: string, data?: unknown): void {
	if (DEBUG_MODE) {
		console.log(message, data !== undefined ? data : "");
	}
}

/**
 * Logs errors in debug mode
 */
export function debugError(message: string, error: unknown): void {
	if (DEBUG_MODE) {
		console.error(message, error);
	}
}
