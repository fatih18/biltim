/**
 * Bun File Manager - Main Export
 * Clean exports for type-safe file operations
 */

// Export singleton class
export { BunFileManager } from "./core";

// Export all types for external usage
export type {
	BulkDeleteResult,
	BulkOperationFunction,
	CreateOperationResult,
	DeleteOperationResult,
	DirectoryOptions,
	FileCreateOptions,
	FileData,
	FileFormat,
	FileInfo,
	FileManagerConfig,
	FileManagerError,
	FileOperationResult,
	FileReadOptions,
	FileSizeUnit,
	FileUpdateMode,
	FileUpdateOptions,
	JsonData,
	JsonPrimitive,
	ReadOperationResult,
	UpdateOperationResult,
	UtilityOperationResult,
} from "./types";

// Export utility functions for external usage
export {
	createFileManagerError,
	DEFAULT_CONFIG,
	ensureDirectoryExists,
	ensureFileExtension,
	executeBulkOperation,
	extractDirectoryPath,
	extractFailedResults,
	extractSuccessfulResults,
	FILE_SIZE_UNITS,
	formatFileSize,
	isValidJson,
	resolvePath,
	safeJsonParse,
	safeJsonStringify,
	validateFileExtension,
} from "./utils";

// Export singleton instance as default
import { BunFileManager } from "./core";

/**
 * Ready-to-use singleton instance
 * Use this for immediate file operations
 */
export const fileManager = BunFileManager.getInstance();

/**
 * Default export - singleton instance
 */
export default fileManager;
