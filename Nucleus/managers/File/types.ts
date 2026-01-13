/**
 * Bun File Manager - Type Definitions
 * Fully type-safe definitions with dynamic type construction
 */

// Base data types for file operations
export type FileData = string | Blob | ArrayBuffer | Uint8Array;

// File format options for reading
export type FileFormat = "text" | "json" | "buffer" | "bytes" | "stream";

// File operation modes
export type FileUpdateMode = "overwrite" | "append";

// File create options type
export type FileCreateOptions = {
	readonly dir: string;
	readonly name: string;
	readonly data: FileData;
	readonly options?: {
		readonly type?: string;
		readonly createDir?: boolean;
	};
};

// File read options type
export type FileReadOptions = {
	readonly path: string;
	readonly format?: FileFormat;
};

// File update options type
export type FileUpdateOptions = {
	readonly path: string;
	readonly data: FileData;
	readonly mode?: FileUpdateMode;
};

// Directory operation options type
export type DirectoryOptions = {
	readonly path: string;
	readonly recursive?: boolean;
};

// Complete file information type
export type FileInfo = {
	readonly name: string;
	readonly path: string;
	readonly size: number;
	readonly type: string;
	readonly exists: boolean;
	readonly extension: string;
	readonly createdAt?: Date;
	readonly modifiedAt?: Date;
};

// Bulk operation result type
export type BulkDeleteResult = {
	readonly success: ReadonlyArray<string>;
	readonly failed: ReadonlyArray<string>;
};

// File operation result type for Promise handling
export type FileOperationResult<T> = {
	readonly success: boolean;
	readonly data?: T;
	readonly error?: string;
};

// JSON operations - safe and flexible types
export type JsonPrimitive = string | number | boolean | null;
export type JsonData = JsonPrimitive | object;

// Bulk operation function type
export type BulkOperationFunction<T, R> = (item: T) => Promise<R>;

// File size units for formatting
export type FileSizeUnit = "B" | "KB" | "MB" | "GB" | "TB";

// Configuration type for file manager
export type FileManagerConfig = {
	readonly defaultEncoding: string;
	readonly defaultCreateDir: boolean;
	readonly defaultRecursive: boolean;
	readonly maxConcurrency: number;
};

// Error types for type-safe error handling
export type FileManagerError = {
	readonly code: string;
	readonly message: string;
	readonly path?: string;
	readonly operation: string;
};

// Method return types for each operation category
export type CreateOperationResult = Promise<number>;
export type ReadOperationResult<T = string> = Promise<T>;
export type UpdateOperationResult = Promise<number>;
export type DeleteOperationResult = Promise<boolean>;
export type UtilityOperationResult<T = boolean> = Promise<T>;

// ============= STREAMING TYPES =============

// FileSink options for streaming operations
export type FileSinkOptions = {
	readonly highWaterMark?: number;
	readonly autoFlush?: boolean;
	readonly closeOnEnd?: boolean;
};

// Streaming write chunk types - Bun FileSink compatible
export type StreamChunk = string | ArrayBuffer | Uint8Array;

// Streaming operation result
export type StreamOperationResult = Promise<number>;

// Stream writer interface type
export type StreamWriter = {
	readonly write: (chunk: StreamChunk) => number;
	readonly flush: () => number | Promise<number>;
	readonly end: (error?: Error) => number | Promise<number>;
	readonly ref: () => void;
	readonly unref: () => void;
};

// ============= PERMISSIONS TYPES =============

// File permission modes (octal representation)
export type FilePermissionMode = number;

// Permission operation options
export type PermissionOptions = {
	readonly path: string;
	readonly mode: FilePermissionMode;
	readonly recursive?: boolean;
};

// Permission info type
export type PermissionInfo = {
	readonly path: string;
	readonly mode: FilePermissionMode;
	readonly owner: {
		readonly read: boolean;
		readonly write: boolean;
		readonly execute: boolean;
	};
	readonly group: {
		readonly read: boolean;
		readonly write: boolean;
		readonly execute: boolean;
	};
	readonly others: {
		readonly read: boolean;
		readonly write: boolean;
		readonly execute: boolean;
	};
};

// Permission operation result
export type PermissionOperationResult = Promise<boolean>;

// ============= ATOMIC OPERATIONS TYPES =============

// Atomic write options
export type AtomicWriteOptions = {
	readonly path: string;
	readonly data: FileData;
	readonly tempSuffix?: string;
	readonly backup?: boolean;
	readonly sync?: boolean;
};

// Atomic operation result with metadata
export type AtomicOperationResult = Promise<{
	readonly success: boolean;
	readonly bytesWritten: number;
	readonly tempPath?: string;
	readonly backupPath?: string;
}>;

// Atomic operation data (without Promise wrapper)
export type AtomicOperationData = {
	readonly success: boolean;
	readonly bytesWritten: number;
	readonly tempPath?: string;
	readonly backupPath?: string;
};

// Backup operation options
export type BackupOptions = {
	readonly sourcePath: string;
	readonly backupDir?: string;
	readonly keepOriginal?: boolean;
	readonly timestamp?: boolean;
};

// ============= CONFIG VALIDATION TYPES =============

// Config validation result
export type ConfigValidationResult = {
	readonly isValid: boolean;
	readonly errors: ReadonlyArray<string>;
	readonly warnings: ReadonlyArray<string>;
};

// Partial config for updates
export type PartialFileManagerConfig = Partial<FileManagerConfig>;

// Config validation options
export type ConfigValidationOptions = {
	readonly strict?: boolean;
	readonly allowUnknownKeys?: boolean;
	readonly validatePaths?: boolean;
};
