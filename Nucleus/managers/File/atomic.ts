/// <reference types="bun-types" />
/**
 * Bun File Manager - Atomic Operations
 * Safe atomic file operations with backup and rollback support
 */

import { copyFile, rename, unlink } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import type {
	AtomicOperationData,
	AtomicOperationResult,
	AtomicWriteOptions,
	BackupOptions,
	FileData,
} from "./types";
import {
	createFileManagerError,
	ensureDirectoryExists,
	extractDirectoryPath,
	resolvePath,
} from "./utils";

/**
 * Default atomic operation configuration
 */
export const DEFAULT_ATOMIC_CONFIG = {
	tempSuffix: ".tmp",
	backup: false,
	sync: true,
	timestamp: true,
} as const;

/**
 * Generates unique temporary file path
 */
export const generateTempPath = (
	originalPath: string,
	suffix = ".tmp",
): string => {
	const resolvedPath = resolvePath(originalPath);
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 8);
	return `${resolvedPath}${suffix}.${timestamp}.${random}`;
};

/**
 * Generates backup file path with optional timestamp
 */
export const generateBackupPath = (
	originalPath: string,
	backupDir?: string,
	useTimestamp = true,
): string => {
	const resolvedPath = resolvePath(originalPath);
	const dir = backupDir ? resolvePath(backupDir) : dirname(resolvedPath);
	const name = basename(resolvedPath);
	const ext = extname(name);
	const nameWithoutExt = basename(name, ext);

	const timestamp = useTimestamp
		? `.${new Date().toISOString().replace(/[:.]/g, "-")}`
		: "";
	const backupName = `${nameWithoutExt}.backup${timestamp}${ext}`;

	return join(dir, backupName);
};

/**
 * Atomic write operation - writes to temp file then renames
 */
export const atomicWrite = async ({
	path,
	data,
	tempSuffix = DEFAULT_ATOMIC_CONFIG.tempSuffix,
	backup = DEFAULT_ATOMIC_CONFIG.backup,
	sync = DEFAULT_ATOMIC_CONFIG.sync,
}: AtomicWriteOptions): Promise<AtomicOperationResult> => {
	const resolvedPath = resolvePath(path);
	const tempPath = generateTempPath(resolvedPath, tempSuffix);
	let backupPath: string | undefined;

	try {
		// Ensure directory exists
		await ensureDirectoryExists(extractDirectoryPath(resolvedPath));

		// Create backup if requested and file exists
		if (backup) {
			const file = Bun.file(resolvedPath);
			if (await file.exists()) {
				backupPath = generateBackupPath(resolvedPath);
				await copyFile(resolvedPath, backupPath);
			}
		}

		// Write to temporary file
		const bytesWritten = await Bun.write(tempPath, data);

		// Sync if requested (Bun handles this automatically)
		if (sync) {
			// Bun.write is already sync by default
		}

		// Atomic rename
		await rename(tempPath, resolvedPath);

		return {
			success: true,
			bytesWritten,
			tempPath,
			backupPath,
		};
	} catch (error) {
		// Cleanup temp file on error
		try {
			await unlink(tempPath);
		} catch {
			// Ignore cleanup errors
		}

		throw createFileManagerError(
			"ATOMIC_WRITE_FAILED",
			`Atomic write failed: ${error}`,
			resolvedPath,
			"atomicWrite",
		);
	}
};

/**
 * Atomic JSON write operation
 */
export const atomicJsonWrite = async (
	path: string,
	data: Record<string, string | number | boolean | null>,
	options: Partial<AtomicWriteOptions> = {},
): Promise<AtomicOperationResult> => {
	const jsonString = JSON.stringify(data, null, 2);

	return atomicWrite({
		path,
		data: jsonString,
		...options,
	});
};

/**
 * Creates backup of existing file
 */
export const createBackup = async ({
	sourcePath,
	backupDir,
	keepOriginal = true,
	timestamp = DEFAULT_ATOMIC_CONFIG.timestamp,
}: BackupOptions): Promise<string> => {
	const resolvedSource = resolvePath(sourcePath);
	const sourceFile = Bun.file(resolvedSource);

	if (!(await sourceFile.exists())) {
		throw createFileManagerError(
			"SOURCE_NOT_FOUND",
			`Source file not found: ${sourcePath}`,
			resolvedSource,
			"createBackup",
		);
	}

	const backupPath = generateBackupPath(resolvedSource, backupDir, timestamp);

	// Ensure backup directory exists
	await ensureDirectoryExists(dirname(backupPath));

	if (keepOriginal) {
		// Copy file
		await copyFile(resolvedSource, backupPath);
	} else {
		// Move file
		await rename(resolvedSource, backupPath);
	}

	return backupPath;
};

/**
 * Restores file from backup
 */
export const restoreFromBackup = async (
	backupPath: string,
	targetPath: string,
	deleteBackup = false,
): Promise<boolean> => {
	const resolvedBackup = resolvePath(backupPath);
	const resolvedTarget = resolvePath(targetPath);
	const backupFile = Bun.file(resolvedBackup);

	if (!(await backupFile.exists())) {
		throw createFileManagerError(
			"BACKUP_NOT_FOUND",
			`Backup file not found: ${backupPath}`,
			resolvedBackup,
			"restoreFromBackup",
		);
	}

	try {
		// Ensure target directory exists
		await ensureDirectoryExists(extractDirectoryPath(resolvedTarget));

		if (deleteBackup) {
			// Move backup to target
			await rename(resolvedBackup, resolvedTarget);
		} else {
			// Copy backup to target
			await copyFile(resolvedBackup, resolvedTarget);
		}

		return true;
	} catch (error) {
		console.error(`Error restoring from backup ${backupPath}:`, error);
		return false;
	}
};

/**
 * Safe file update with automatic rollback on error
 */
export const safeUpdate = async (
	path: string,
	updateFunction: (currentData: string) => Promise<FileData> | FileData,
	options: Partial<AtomicWriteOptions> = {},
): Promise<AtomicOperationResult> => {
	const resolvedPath = resolvePath(path);
	const file = Bun.file(resolvedPath);
	let backupPath: string | undefined;

	try {
		// Create backup
		if (await file.exists()) {
			backupPath = await createBackup({
				sourcePath: resolvedPath,
				keepOriginal: true,
				timestamp: true,
			});
		}

		// Read current data
		const currentData = (await file.exists()) ? await file.text() : "";

		// Apply update function
		const newData = await updateFunction(currentData);

		// Atomic write
		const result = await atomicWrite({
			path: resolvedPath,
			data: newData,
			backup: false, // We already created backup
			...options,
		});

		return {
			success: result.success,
			bytesWritten: result.bytesWritten,
			tempPath: result.tempPath,
			backupPath,
		};
	} catch (error) {
		// Rollback from backup if available
		if (backupPath) {
			try {
				await restoreFromBackup(backupPath, resolvedPath, false);
			} catch (rollbackError) {
				console.error("Rollback failed:", rollbackError);
			}
		}

		throw error;
	}
};

/**
 * Batch atomic operations with rollback support
 */
export const batchAtomicWrite = async (
	operations: ReadonlyArray<AtomicWriteOptions>,
): Promise<{
	successful: ReadonlyArray<AtomicOperationData>;
	failed: ReadonlyArray<{ operation: AtomicWriteOptions; error: Error }>;
}> => {
	const successful: AtomicOperationData[] = [];
	const failed: { operation: AtomicWriteOptions; error: Error }[] = [];

	for (const operation of operations) {
		try {
			const result = await atomicWrite(operation);
			successful.push(result);
		} catch (error) {
			failed.push({ operation, error: error as Error });
		}
	}

	return { successful, failed };
};

/**
 * Cleans up temporary and backup files
 */
export const cleanupFiles = async (
	paths: ReadonlyArray<string>,
): Promise<{
	cleaned: ReadonlyArray<string>;
	failed: ReadonlyArray<string>;
}> => {
	const cleaned: string[] = [];
	const failed: string[] = [];

	for (const path of paths) {
		try {
			await unlink(resolvePath(path));
			cleaned.push(path);
		} catch {
			failed.push(path);
		}
	}

	return { cleaned, failed };
};

/**
 * Verifies atomic operation integrity
 */
export const verifyAtomicWrite = async (
	path: string,
	expectedSize?: number,
	checksumFunction?: (data: Uint8Array) => string,
	expectedChecksum?: string,
): Promise<boolean> => {
	const resolvedPath = resolvePath(path);
	const file = Bun.file(resolvedPath);

	if (!(await file.exists())) {
		return false;
	}

	// Check file size if provided
	if (expectedSize !== undefined && file.size !== expectedSize) {
		return false;
	}

	// Check checksum if provided
	if (checksumFunction && expectedChecksum) {
		const data = await file.bytes();
		const actualChecksum = checksumFunction(data);
		return actualChecksum === expectedChecksum;
	}

	return true;
};
