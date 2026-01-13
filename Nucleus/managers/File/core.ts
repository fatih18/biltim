/**
 * Bun File Manager - Core Singleton Class
 * Type-safe CRUD operations using Bun's optimized APIs
 */
/** biome-ignore-all lint/correctness/noUnusedPrivateClassMembers: <> */

import { readdir, rm, stat } from "node:fs/promises";
import { extname, join } from "node:path";
import {
	atomicJsonWrite,
	atomicWrite,
	batchAtomicWrite,
	createBackup,
	restoreFromBackup,
	safeUpdate,
} from "./atomic";
import {
	getFilePermissions,
	hasPermissions,
	makeExecutable,
	makeReadable,
	makeReadOnly,
	makeWritable,
	type PERMISSION_MODES,
	setCommonPermissions,
	setFilePermissions,
} from "./permissions";
import {
	appendStream,
	copyFileStream,
	createFileWriter,
	readFileStream,
	writeStream,
} from "./streaming";
import type {
	AtomicOperationData,
	AtomicOperationResult,
	AtomicWriteOptions,
	BackupOptions,
	BulkDeleteResult,
	ConfigValidationResult,
	CreateOperationResult,
	DeleteOperationResult,
	DirectoryOptions,
	FileCreateOptions,
	FileInfo,
	FileManagerConfig,
	FilePermissionMode,
	FileReadOptions,
	FileSinkOptions,
	FileUpdateOptions,
	JsonData,
	PartialFileManagerConfig,
	PermissionInfo,
	PermissionOperationResult,
	PermissionOptions,
	ReadOperationResult,
	StreamChunk,
	StreamOperationResult,
	StreamWriter,
	UpdateOperationResult,
	UtilityOperationResult,
} from "./types";
import {
	createFileManagerError,
	DEFAULT_CONFIG,
	ensureDirectoryExists,
	ensureFileExtension,
	executeBulkOperation,
	extractDirectoryPath,
	formatFileSize,
	mergeConfig,
	resolvePath,
	safeJsonStringify,
	validateConfig,
} from "./utils";

export class BunFileManager {
	private static instance: BunFileManager;
	private readonly config: FileManagerConfig;

	private constructor() {
		this.config = { ...DEFAULT_CONFIG };
	}

	/**
	 * Get singleton instance
	 */
	public static getInstance(): BunFileManager {
		if (!BunFileManager.instance) {
			BunFileManager.instance = new BunFileManager();
		}
		return BunFileManager.instance;
	}

	// ============= CREATE OPERATIONS =============

	/**
	 * Create new file with automatic directory creation
	 */
	async createFile({
		dir,
		name,
		data,
		options = {},
	}: FileCreateOptions): CreateOperationResult {
		const filePath = resolvePath(join(dir, name));
		if (options.createDir !== false) {
			await ensureDirectoryExists(extractDirectoryPath(filePath));
		}

		const fileData = options.type
			? new Blob([data as BlobPart], { type: options.type })
			: data;

		return await Bun.write(filePath, fileData);
	}

	/**
	 * Create JSON file with automatic formatting
	 */
	async createJsonFile(
		dir: string,
		name: string,
		data: JsonData,
	): CreateOperationResult {
		const fileName = ensureFileExtension(name, ".json");
		const jsonString = safeJsonStringify(data);

		return this.createFile({
			dir,
			name: fileName,
			data: jsonString,
			options: { type: "application/json" },
		});
	}

	/**
	 * Create directory with recursive option
	 */
	async createDirectory({ path }: DirectoryOptions): Promise<void> {
		await ensureDirectoryExists(path);
	}

	// ============= READ OPERATIONS =============

	/**
	 * Read file in specified format
	 */
	async readFile<T = string>({
		path,
		format = "text",
	}: FileReadOptions): ReadOperationResult<T> {
		const resolvedPath = resolvePath(path);
		const file = Bun.file(resolvedPath);

		if (!(await file.exists())) {
			throw createFileManagerError(
				"FILE_NOT_FOUND",
				`File not found: ${path}`,
				resolvedPath,
				"readFile",
			);
		}

		switch (format) {
			case "text":
				return (await file.text()) as T;
			case "json":
				return (await file.json()) as T;
			case "buffer":
				return (await file.arrayBuffer()) as T;
			case "bytes":
				return (await file.bytes()) as T;
			case "stream":
				return file.stream() as T;
			default:
				return (await file.text()) as T;
		}
	}

	/**
	 * Read JSON file with type safety
	 */
	async readJsonFile<T extends JsonData = JsonData>(
		path: string,
	): ReadOperationResult<T> {
		return this.readFile<T>({ path, format: "json" });
	}

	/**
	 * Get comprehensive file information
	 */
	async getFileInfo(path: string): ReadOperationResult<FileInfo> {
		const resolvedPath = resolvePath(path);
		const file = Bun.file(resolvedPath);
		const fileName = path.split("/").pop() || path;

		let stats = null;
		try {
			stats = await stat(resolvedPath);
		} catch {
			// File doesn't exist, stats remains null
		}

		return {
			name: fileName,
			path: resolvedPath,
			size: file.size,
			type: file.type,
			exists: await file.exists(),
			extension: extname(fileName),
			createdAt: stats?.birthtime,
			modifiedAt: stats?.mtime,
		};
	}

	/**
	 * Read directory contents
	 */
	async readDirectory({
		path,
		recursive = false,
	}: DirectoryOptions): ReadOperationResult<ReadonlyArray<string>> {
		const resolvedPath = resolvePath(path);
		return await readdir(resolvedPath, {
			recursive,
			encoding: "utf8",
		});
	}

	/**
	 * Get files by extension from directory
	 */
	async getFilesByExtension(
		dir: string,
		extension: string,
	): ReadOperationResult<ReadonlyArray<string>> {
		const files = await this.readDirectory({ path: dir });
		const normalizedExt = extension.startsWith(".")
			? extension
			: `.${extension}`;

		return files.filter((file) => file.endsWith(normalizedExt));
	}

	// ============= UPDATE OPERATIONS =============

	/**
	 * Update file with overwrite or append mode
	 */
	async updateFile({
		path,
		data,
		mode = "overwrite",
	}: FileUpdateOptions): UpdateOperationResult {
		const resolvedPath = resolvePath(path);

		if (mode === "append") {
			const existingData = await this.readFile({ path, format: "text" });
			const combinedData = existingData + data;
			return await Bun.write(resolvedPath, combinedData);
		}

		return await Bun.write(resolvedPath, data);
	}

	/**
	 * Update JSON file with merge option
	 */
	async updateJsonFile(
		path: string,
		data: JsonData,
		merge = false,
	): UpdateOperationResult {
		let finalData = data;

		if (merge) {
			try {
				const existingData = await this.readJsonFile(path);

				// Only merge if both are objects
				if (
					typeof existingData === "object" &&
					existingData !== null &&
					!Array.isArray(existingData) &&
					typeof data === "object" &&
					data !== null &&
					!Array.isArray(data)
				) {
					finalData = { ...existingData, ...data };
				}
			} catch {
				// File doesn't exist or is unreadable, use new data
			}
		}

		return this.updateFile({
			path,
			data: safeJsonStringify(finalData),
			mode: "overwrite",
		});
	}

	/**
	 * Append data to existing file
	 */
	async appendToFile(path: string, data: string): UpdateOperationResult {
		return this.updateFile({ path, data, mode: "append" });
	}

	// ============= DELETE OPERATIONS =============

	/**
	 * Delete single file
	 */
	async deleteFile(path: string): DeleteOperationResult {
		try {
			const resolvedPath = resolvePath(path);
			const file = Bun.file(resolvedPath);
			await file.delete();
			return true;
		} catch (error) {
			console.error(`Error deleting file ${path}:`, error);
			return false;
		}
	}

	/**
	 * Delete directory
	 */
	async deleteDirectory({
		path,
		recursive = false,
	}: DirectoryOptions): DeleteOperationResult {
		try {
			const resolvedPath = resolvePath(path);
			await rm(resolvedPath, { recursive, force: true });
			return true;
		} catch (error) {
			console.error(`Error deleting directory ${path}:`, error);
			return false;
		}
	}

	/**
	 * Delete multiple files with result tracking
	 */
	async deleteFiles(
		paths: ReadonlyArray<string>,
	): ReadOperationResult<BulkDeleteResult> {
		const results = await executeBulkOperation(paths, async (path: string) => {
			const success = await this.deleteFile(path);
			if (!success) throw new Error(`Failed to delete: ${path}`);
			return path;
		});

		const success: string[] = [];
		const failed: string[] = [];

		for (let i = 0; i < results.length; i++) {
			const result = results[i];
			const originalPath = paths[i];

			if (result?.status === "fulfilled") {
				success.push(originalPath || "");
			} else {
				failed.push(originalPath || "");
			}
		}

		return { success, failed };
	}

	// ============= UTILITY OPERATIONS =============

	/**
	 * Check if file exists
	 */
	async exists(path: string): UtilityOperationResult {
		const resolvedPath = resolvePath(path);
		const file = Bun.file(resolvedPath);
		return await file.exists();
	}

	/**
	 * Copy file to new location
	 */
	async copyFile(
		sourcePath: string,
		destinationPath: string,
	): UtilityOperationResult<number> {
		const resolvedSource = resolvePath(sourcePath);
		const resolvedDestination = resolvePath(destinationPath);
		const sourceFile = Bun.file(resolvedSource);

		if (!(await sourceFile.exists())) {
			throw createFileManagerError(
				"SOURCE_NOT_FOUND",
				`Source file not found: ${sourcePath}`,
				resolvedSource,
				"copyFile",
			);
		}

		await ensureDirectoryExists(extractDirectoryPath(resolvedDestination));
		return await Bun.write(resolvedDestination, sourceFile);
	}

	/**
	 * Move file to new location
	 */
	async moveFile(
		sourcePath: string,
		destinationPath: string,
	): DeleteOperationResult {
		try {
			await this.copyFile(sourcePath, destinationPath);
			await this.deleteFile(sourcePath);
			return true;
		} catch (error) {
			console.error(
				`Error moving file from ${sourcePath} to ${destinationPath}:`,
				error,
			);
			return false;
		}
	}

	/**
	 * Get formatted file size
	 */
	getFormattedFileSize(bytes: number): string {
		return formatFileSize(bytes);
	}

	/**
	 * Get configuration
	 */
	getConfig(): FileManagerConfig {
		return { ...this.config };
	}

	/**
	 * Update configuration with validation
	 */
	updateConfig(newConfig: PartialFileManagerConfig): ConfigValidationResult {
		const validation = validateConfig(newConfig);

		if (validation.isValid) {
			const mergedConfig = mergeConfig(newConfig, this.config);
			Object.assign(this.config, mergedConfig);
		}

		return validation;
	}

	/**
	 * Validate configuration without applying
	 */
	validateConfiguration(
		config: PartialFileManagerConfig,
	): ConfigValidationResult {
		return validateConfig(config);
	}

	// ============= STREAMING OPERATIONS =============

	/**
	 * Create file writer for streaming operations
	 */
	async createStreamWriter(
		path: string,
		options: FileSinkOptions = {},
	): Promise<StreamWriter> {
		return createFileWriter(path, options);
	}

	/**
	 * Write data using streaming (memory efficient for large data)
	 */
	async writeStream(
		path: string,
		chunks: ReadonlyArray<StreamChunk>,
		options: FileSinkOptions = {},
	): StreamOperationResult {
		return writeStream(path, chunks, options);
	}

	/**
	 * Append data using streaming
	 */
	async appendStream(
		path: string,
		chunks: ReadonlyArray<StreamChunk>,
		options: FileSinkOptions = {},
	): StreamOperationResult {
		return appendStream(path, chunks, options);
	}

	/**
	 * Copy file using streaming (efficient for large files)
	 */
	async copyFileStream(
		sourcePath: string,
		destinationPath: string,
		options: FileSinkOptions = {},
	): StreamOperationResult {
		return copyFileStream(sourcePath, destinationPath, options);
	}

	/**
	 * Read file in chunks using streaming
	 */
	async readFileStream(
		path: string,
		chunkProcessor: (chunk: Uint8Array) => Promise<void>,
	): Promise<void> {
		return readFileStream(path, chunkProcessor);
	}

	// ============= PERMISSION OPERATIONS =============

	/**
	 * Set file permissions using octal mode
	 */
	async setPermissions(
		path: string,
		mode: FilePermissionMode,
	): PermissionOperationResult {
		return setFilePermissions(path, mode);
	}

	/**
	 * Set permissions using options
	 */
	async setPermissionsAdvanced(
		options: PermissionOptions,
	): PermissionOperationResult {
		return setFilePermissions(options.path, options.mode);
	}

	/**
	 * Get detailed file permission information
	 */
	async getPermissions(path: string): Promise<PermissionInfo> {
		return getFilePermissions(path);
	}

	/**
	 * Check if file has specific permissions
	 */
	async checkPermissions(
		path: string,
		requiredMode: FilePermissionMode,
	): Promise<boolean> {
		return hasPermissions(path, requiredMode);
	}

	/**
	 * Make file readable by owner
	 */
	async makeFileReadable(path: string): PermissionOperationResult {
		return makeReadable(path);
	}

	/**
	 * Make file writable by owner
	 */
	async makeFileWritable(path: string): PermissionOperationResult {
		return makeWritable(path);
	}

	/**
	 * Make file executable by owner
	 */
	async makeFileExecutable(path: string): PermissionOperationResult {
		return makeExecutable(path);
	}

	/**
	 * Make file read-only (remove write permissions)
	 */
	async makeFileReadOnly(path: string): PermissionOperationResult {
		return makeReadOnly(path);
	}

	/**
	 * Set common permission patterns
	 */
	async setCommonPermission(
		path: string,
		pattern: keyof typeof PERMISSION_MODES,
	): PermissionOperationResult {
		return setCommonPermissions(path, pattern);
	}

	// ============= ATOMIC OPERATIONS =============

	/**
	 * Atomic file write (crash-safe)
	 */
	async atomicWrite(options: AtomicWriteOptions): AtomicOperationResult {
		return atomicWrite(options);
	}

	/**
	 * Atomic JSON file write
	 */
	async atomicJsonWrite(
		path: string,
		data: Record<string, string | number | boolean | null>,
		options: Partial<AtomicWriteOptions> = {},
	): AtomicOperationResult {
		return atomicJsonWrite(path, data, options);
	}

	/**
	 * Create backup of file
	 */
	async createFileBackup(options: BackupOptions): Promise<string> {
		return createBackup(options);
	}

	/**
	 * Restore file from backup
	 */
	async restoreFileFromBackup(
		backupPath: string,
		targetPath: string,
		deleteBackup = false,
	): Promise<boolean> {
		return restoreFromBackup(backupPath, targetPath, deleteBackup);
	}

	/**
	 * Safe file update with automatic rollback
	 */
	async safeFileUpdate(
		path: string,
		updateFunction: (currentData: string) => Promise<string> | string,
		options: Partial<AtomicWriteOptions> = {},
	): AtomicOperationResult {
		return safeUpdate(path, updateFunction, options);
	}

	/**
	 * Batch atomic operations
	 */
	async batchAtomicOperations(
		operations: ReadonlyArray<AtomicWriteOptions>,
	): Promise<{
		successful: ReadonlyArray<AtomicOperationData>;
		failed: ReadonlyArray<{ operation: AtomicWriteOptions; error: Error }>;
	}> {
		return batchAtomicWrite(operations);
	}
}

// Ensure class is properly exported
export default BunFileManager;
