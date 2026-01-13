/**
 * Bun File Manager - Utility Functions
 * Type-safe helper functions for file operations
 */

import { access, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type {
	BulkOperationFunction,
	ConfigValidationOptions,
	ConfigValidationResult,
	FileManagerConfig,
	FileManagerError,
	FilePermissionMode,
	FileSizeUnit,
	JsonData,
	PartialFileManagerConfig,
} from "./types";

// Default configuration for file manager
export const DEFAULT_CONFIG: FileManagerConfig = {
	defaultEncoding: "utf-8",
	defaultCreateDir: true,
	defaultRecursive: true,
	maxConcurrency: 5,
} as const;

// File size units array for formatting
export const FILE_SIZE_UNITS: ReadonlyArray<FileSizeUnit> = [
	"B",
	"KB",
	"MB",
	"GB",
	"TB",
] as const;

// ============= PATH UTILITIES =============

/**
 * Resolves and validates file path
 */
export const resolvePath = (path: string): string => {
	if (!path || typeof path !== "string") {
		throw createFileManagerError(
			"INVALID_PATH",
			"Path must be a non-empty string",
			path,
			"resolvePath",
		);
	}
	return resolve(path);
};

/**
 * Extracts directory path from file path
 */
export const extractDirectoryPath = (filePath: string): string => {
	const resolvedPath = resolvePath(filePath);
	return dirname(resolvedPath);
};

/**
 * Ensures directory exists, creates if not
 */
export const ensureDirectoryExists = async (dirPath: string): Promise<void> => {
	const resolvedPath = resolve(dirPath);

	try {
		await mkdir(resolvedPath, { recursive: true });
	} catch (error) {
		const err = error as NodeJS.ErrnoException;
		if (err.code !== "EEXIST") {
			throw createFileManagerError(
				"DIRECTORY_CREATE_FAILED",
				`Failed to create directory: ${resolvedPath}`,
				resolvedPath,
				"ensureDirectory",
			);
		}
	}
};

/**
 * Validates if path is accessible
 */
export const validatePathAccess = async (path: string): Promise<boolean> => {
	try {
		await access(resolvePath(path));
		return true;
	} catch {
		return false;
	}
};

// ============= FILE UTILITIES =============

/**
 * Formats file size from bytes to human readable format
 */
export const formatFileSize = (bytes: number): string => {
	let size = bytes;
	let unitIndex = 0;

	while (size >= 1024 && unitIndex < FILE_SIZE_UNITS.length - 1) {
		size /= 1024;
		unitIndex++;
	}

	return `${size.toFixed(2)} ${FILE_SIZE_UNITS[unitIndex]}`;
};

/**
 * Validates file extension
 */
export const validateFileExtension = (
	fileName: string,
	expectedExtension: string,
): boolean => {
	return fileName.toLowerCase().endsWith(expectedExtension.toLowerCase());
};

/**
 * Adds extension to filename if not present
 */
export const ensureFileExtension = (
	fileName: string,
	extension: string,
): string => {
	const normalizedExtension = extension.startsWith(".")
		? extension
		: `.${extension}`;

	if (validateFileExtension(fileName, normalizedExtension)) {
		return fileName;
	}

	return `${fileName}${normalizedExtension}`;
};

// ============= ERROR UTILITIES =============

/**
 * Creates standardized error object
 */
export const createFileManagerError = (
	code: string,
	message: string,
	path?: string,
	operation?: string,
): FileManagerError => {
	return {
		code,
		message,
		path,
		operation: operation || "unknown",
	} as const;
};

// ============= JSON UTILITIES =============

/**
 * Safely parses JSON string with error handling
 */
export const safeJsonParse = <T = JsonData>(jsonString: string): T | null => {
	try {
		return JSON.parse(jsonString) as T;
	} catch {
		return null;
	}
};

/**
 * Safely stringifies JSON with error handling
 */
export const safeJsonStringify = (
	data: string | number | boolean | null | object,
): string => {
	try {
		return JSON.stringify(data, null, 2);
	} catch {
		return "{}";
	}
};

/**
 * Validates if string is valid JSON
 */
export const isValidJson = (str: string): boolean => {
	return safeJsonParse<JsonData>(str) !== null;
};

// ============= BULK OPERATIONS =============

/**
 * Executes bulk operations with concurrency control
 */
export const executeBulkOperation = async <T, R>(
	items: ReadonlyArray<T>,
	operation: BulkOperationFunction<T, R>,
	concurrency = DEFAULT_CONFIG.maxConcurrency,
): Promise<ReadonlyArray<PromiseSettledResult<R>>> => {
	const results: PromiseSettledResult<R>[] = [];

	for (let i = 0; i < items.length; i += concurrency) {
		const batch = items.slice(i, i + concurrency);
		const batchPromises: Promise<R>[] = [];

		for (const item of batch) {
			batchPromises.push(operation(item));
		}

		const batchResults = await Promise.allSettled(batchPromises);
		results.push(...batchResults);
	}

	return results;
};

/**
 * Creates array of successful results from bulk operation
 */
export const extractSuccessfulResults = <T>(
	results: ReadonlyArray<PromiseSettledResult<T>>,
): ReadonlyArray<T> => {
	const successfulResults: T[] = [];

	for (const result of results) {
		if (result.status === "fulfilled") {
			successfulResults.push(result.value);
		}
	}

	return successfulResults;
};

/**
 * Creates array of failed results from bulk operation
 */
export const extractFailedResults = <T>(
	results: ReadonlyArray<PromiseSettledResult<T>>,
): ReadonlyArray<string> => {
	const failedResults: string[] = [];

	for (const result of results) {
		if (result.status === "rejected") {
			failedResults.push(result.reason.message || "Unknown error");
		}
	}

	return failedResults;
};

// ============= CONFIG VALIDATION =============

/**
 * Validates file manager configuration
 */
export const validateConfig = (
	config: PartialFileManagerConfig,
	options: ConfigValidationOptions = {},
): ConfigValidationResult => {
	const errors: string[] = [];
	const warnings: string[] = [];
	const strict = options.strict ?? true;

	// Validate defaultEncoding
	if (config.defaultEncoding !== undefined) {
		const validEncodings = ["utf-8", "utf8", "ascii", "base64", "hex"];
		if (!validEncodings.includes(config.defaultEncoding)) {
			errors.push(`Invalid defaultEncoding: ${config.defaultEncoding}`);
		}
	}

	// Validate maxConcurrency
	if (config.maxConcurrency !== undefined) {
		if (!Number.isInteger(config.maxConcurrency) || config.maxConcurrency < 1) {
			errors.push("maxConcurrency must be a positive integer");
		}
		if (config.maxConcurrency > 50) {
			warnings.push("maxConcurrency > 50 may cause performance issues");
		}
	}

	// Validate boolean fields
	if (
		config.defaultCreateDir !== undefined &&
		typeof config.defaultCreateDir !== "boolean"
	) {
		errors.push("defaultCreateDir must be a boolean");
	}

	if (
		config.defaultRecursive !== undefined &&
		typeof config.defaultRecursive !== "boolean"
	) {
		errors.push("defaultRecursive must be a boolean");
	}

	// Check for unknown keys in strict mode
	if (strict && !options.allowUnknownKeys) {
		const validKeys = [
			"defaultEncoding",
			"defaultCreateDir",
			"defaultRecursive",
			"maxConcurrency",
		];
		const configKeys = Object.keys(config);

		for (const key of configKeys) {
			if (!validKeys.includes(key)) {
				errors.push(`Unknown configuration key: ${key}`);
			}
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
	};
};

/**
 * Merges partial config with defaults safely
 */
export const mergeConfig = (
	partial: PartialFileManagerConfig,
	base: FileManagerConfig = DEFAULT_CONFIG,
): FileManagerConfig => {
	const validation = validateConfig(partial);

	if (!validation.isValid) {
		throw createFileManagerError(
			"CONFIG_VALIDATION_FAILED",
			`Configuration validation failed: ${validation.errors.join(", ")}`,
			undefined,
			"mergeConfig",
		);
	}

	return {
		...base,
		...partial,
	};
};

// ============= PERMISSION UTILITIES =============

/**
 * Converts octal permission to readable format
 */
export const parsePermissions = (
	mode: FilePermissionMode,
): {
	owner: { read: boolean; write: boolean; execute: boolean };
	group: { read: boolean; write: boolean; execute: boolean };
	others: { read: boolean; write: boolean; execute: boolean };
} => {
	const parseOctal = (octal: number) => ({
		read: Boolean(octal & 4),
		write: Boolean(octal & 2),
		execute: Boolean(octal & 1),
	});

	const ownerMode = (mode >> 6) & 7;
	const groupMode = (mode >> 3) & 7;
	const othersMode = mode & 7;

	return {
		owner: parseOctal(ownerMode),
		group: parseOctal(groupMode),
		others: parseOctal(othersMode),
	};
};

/**
 * Converts readable permissions to octal
 */
export const createPermissionMode = (
	owner: { read: boolean; write: boolean; execute: boolean },
	group: { read: boolean; write: boolean; execute: boolean },
	others: { read: boolean; write: boolean; execute: boolean },
): FilePermissionMode => {
	const convertToOctal = (perms: typeof owner) =>
		(perms.read ? 4 : 0) + (perms.write ? 2 : 0) + (perms.execute ? 1 : 0);

	return (
		(convertToOctal(owner) << 6) +
		(convertToOctal(group) << 3) +
		convertToOctal(others)
	);
};

/**
 * Validates permission mode
 */
export const validatePermissionMode = (mode: FilePermissionMode): boolean => {
	return Number.isInteger(mode) && mode >= 0 && mode <= 0o777;
};
