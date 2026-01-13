/**
 * Bun File Manager - Permissions Operations
 * Cross-platform file permissions management
 */

import { chmod, stat } from "node:fs/promises";
import type {
	FilePermissionMode,
	PermissionInfo,
	PermissionOperationResult,
	PermissionOptions,
} from "./types";
import {
	createFileManagerError,
	createPermissionMode,
	parsePermissions,
	resolvePath,
	validatePermissionMode,
} from "./utils";

/**
 * Common permission modes as constants
 */
export const PERMISSION_MODES = {
	OWNER_READ_WRITE: 0o600,
	OWNER_ALL: 0o700,
	GROUP_READ: 0o640,
	GROUP_READ_WRITE: 0o660,
	ALL_READ: 0o644,
	ALL_READ_WRITE: 0o666,
	ALL_READ_EXECUTE: 0o755,
	ALL_FULL: 0o777,
	READ_ONLY: 0o444,
	EXECUTABLE: 0o755,
} as const;

/**
 * Sets file permissions using octal mode
 */
export const setFilePermissions = async (
	path: string,
	mode: FilePermissionMode,
): PermissionOperationResult => {
	const resolvedPath = resolvePath(path);

	if (!validatePermissionMode(mode)) {
		throw createFileManagerError(
			"INVALID_PERMISSION_MODE",
			`Invalid permission mode: ${mode.toString(8)}`,
			resolvedPath,
			"setFilePermissions",
		);
	}

	try {
		await chmod(resolvedPath, mode);
		return true;
	} catch (error) {
		console.error(`Error setting permissions for ${path}:`, error);
		return false;
	}
};

/**
 * Sets file permissions using permission options
 */
export const setPermissions = async ({
	path,
	mode,
	recursive = false,
}: PermissionOptions): PermissionOperationResult => {
	if (recursive) {
		// For recursive operations, we'd need to walk the directory tree
		// This is a simplified version for files only
		console.warn("Recursive permission setting not fully implemented");
	}

	return setFilePermissions(path, mode);
};

/**
 * Gets detailed file permission information
 */
export const getFilePermissions = async (
	path: string,
): Promise<PermissionInfo> => {
	const resolvedPath = resolvePath(path);

	try {
		const stats = await stat(resolvedPath);
		const mode = stats.mode & 0o777; // Extract permission bits
		const permissions = parsePermissions(mode);

		return {
			path: resolvedPath,
			mode,
			owner: permissions.owner,
			group: permissions.group,
			others: permissions.others,
		};
	} catch (error) {
		throw createFileManagerError(
			"PERMISSION_READ_FAILED",
			`Failed to read permissions: ${error}`,
			resolvedPath,
			"getFilePermissions",
		);
	}
};

/**
 * Checks if file has specific permissions
 */
export const hasPermissions = async (
	path: string,
	requiredMode: FilePermissionMode,
): Promise<boolean> => {
	try {
		const info = await getFilePermissions(path);
		return (info.mode & requiredMode) === requiredMode;
	} catch {
		return false;
	}
};

/**
 * Makes file readable by owner
 */
export const makeReadable = async (path: string): PermissionOperationResult => {
	const info = await getFilePermissions(path);
	const newMode = info.mode | 0o400; // Add owner read permission
	return setFilePermissions(path, newMode);
};

/**
 * Makes file writable by owner
 */
export const makeWritable = async (path: string): PermissionOperationResult => {
	const info = await getFilePermissions(path);
	const newMode = info.mode | 0o200; // Add owner write permission
	return setFilePermissions(path, newMode);
};

/**
 * Makes file executable by owner
 */
export const makeExecutable = async (
	path: string,
): PermissionOperationResult => {
	const info = await getFilePermissions(path);
	const newMode = info.mode | 0o100; // Add owner execute permission
	return setFilePermissions(path, newMode);
};

/**
 * Removes write permissions (makes read-only)
 */
export const makeReadOnly = async (path: string): PermissionOperationResult => {
	const info = await getFilePermissions(path);
	const newMode = info.mode & ~0o222; // Remove all write permissions
	return setFilePermissions(path, newMode);
};

/**
 * Sets common permission patterns
 */
export const setCommonPermissions = async (
	path: string,
	pattern: keyof typeof PERMISSION_MODES,
): PermissionOperationResult => {
	const mode = PERMISSION_MODES[pattern];
	return setFilePermissions(path, mode);
};

/**
 * Bulk permission operations
 */
export const setBulkPermissions = async (
	paths: ReadonlyArray<string>,
	mode: FilePermissionMode,
): Promise<{ success: string[]; failed: string[] }> => {
	const results = { success: [] as string[], failed: [] as string[] };

	for (const path of paths) {
		const success = await setFilePermissions(path, mode);
		if (success) {
			results.success.push(path);
		} else {
			results.failed.push(path);
		}
	}

	return results;
};

/**
 * Creates permission mode from readable format
 */
export const createPermissionFromReadable = (
	ownerRead: boolean,
	ownerWrite: boolean,
	ownerExecute: boolean,
	groupRead = false,
	groupWrite = false,
	groupExecute = false,
	othersRead = false,
	othersWrite = false,
	othersExecute = false,
): FilePermissionMode => {
	return createPermissionMode(
		{ read: ownerRead, write: ownerWrite, execute: ownerExecute },
		{ read: groupRead, write: groupWrite, execute: groupExecute },
		{ read: othersRead, write: othersWrite, execute: othersExecute },
	);
};

/**
 * Formats permission mode as human-readable string
 */
export const formatPermissions = (mode: FilePermissionMode): string => {
	const permissions = parsePermissions(mode);

	const formatGroup = (group: {
		read: boolean;
		write: boolean;
		execute: boolean;
	}) =>
		[
			group.read ? "r" : "-",
			group.write ? "w" : "-",
			group.execute ? "x" : "-",
		].join("");

	return [
		formatGroup(permissions.owner),
		formatGroup(permissions.group),
		formatGroup(permissions.others),
	].join("");
};
