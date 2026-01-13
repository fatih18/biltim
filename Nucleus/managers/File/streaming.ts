/**
 * Bun File Manager - Streaming Operations
 * FileSink based streaming for large file operations
 */

import type {
	FileSinkOptions,
	StreamChunk,
	StreamOperationResult,
	StreamWriter,
} from "./types";
import {
	createFileManagerError,
	ensureDirectoryExists,
	extractDirectoryPath,
	resolvePath,
} from "./utils";

/**
 * Default streaming configuration
 */
export const DEFAULT_STREAM_CONFIG: Required<FileSinkOptions> = {
	highWaterMark: 1024 * 1024, // 1MB
	autoFlush: true,
	closeOnEnd: true,
} as const;

/**
 * Creates a file writer using Bun's FileSink
 */
export const createFileWriter = async (
	path: string,
	options: FileSinkOptions = {},
): Promise<StreamWriter> => {
	const resolvedPath = resolvePath(path);
	const config = { ...DEFAULT_STREAM_CONFIG, ...options };

	// Ensure directory exists
	await ensureDirectoryExists(extractDirectoryPath(resolvedPath));

	// Create Bun file and writer
	const file = Bun.file(resolvedPath);
	const writer = file.writer({
		highWaterMark: config.highWaterMark,
	});

	// Track if writer is closed
	let isClosed = false;

	// Enhanced writer with error handling
	const streamWriter: StreamWriter = {
		write: (chunk: StreamChunk): number => {
			if (isClosed) {
				throw createFileManagerError(
					"WRITER_CLOSED",
					"Cannot write to closed writer",
					resolvedPath,
					"streamWrite",
				);
			}

			try {
				const bytesWritten = writer.write(chunk) as number;

				// Auto flush if enabled
				if (config.autoFlush && bytesWritten > 0) {
					writer.flush();
				}

				return bytesWritten;
			} catch (error) {
				throw createFileManagerError(
					"WRITE_FAILED",
					`Failed to write chunk: ${error}`,
					resolvedPath,
					"streamWrite",
				);
			}
		},

		flush: (): number | Promise<number> => {
			if (isClosed) {
				return 0;
			}

			try {
				return writer.flush();
			} catch (error) {
				throw createFileManagerError(
					"FLUSH_FAILED",
					`Failed to flush writer: ${error}`,
					resolvedPath,
					"streamFlush",
				);
			}
		},

		end: async (error?: Error): Promise<number> => {
			if (isClosed) {
				return 0;
			}

			try {
				const result = await writer.end(error);
				isClosed = true;
				return result;
			} catch (err) {
				isClosed = true;
				throw createFileManagerError(
					"END_FAILED",
					`Failed to end writer: ${err}`,
					resolvedPath,
					"streamEnd",
				);
			}
		},

		ref: (): void => {
			if (!isClosed) {
				writer.ref();
			}
		},

		unref: (): void => {
			if (!isClosed) {
				writer.unref();
			}
		},
	};

	return streamWriter;
};

/**
 * Writes data to file using streaming
 */
export const writeStream = async (
	path: string,
	chunks: ReadonlyArray<StreamChunk>,
	options: FileSinkOptions = {},
): StreamOperationResult => {
	const writer = await createFileWriter(path, options);
	let totalBytes = 0;

	try {
		for (const chunk of chunks) {
			const bytesWritten = writer.write(chunk);
			totalBytes += bytesWritten;
		}

		// Final flush and close
		await writer.flush();
		await writer.end();

		return totalBytes;
	} catch (error) {
		// Ensure writer is closed on error
		try {
			await writer.end(error as Error);
		} catch {
			// Ignore cleanup errors
		}
		throw error;
	}
};

/**
 * Appends data to file using streaming
 */
export const appendStream = async (
	path: string,
	chunks: ReadonlyArray<StreamChunk>,
	options: FileSinkOptions = {},
): StreamOperationResult => {
	const resolvedPath = resolvePath(path);

	// Check if file exists, read existing content if it does
	const file = Bun.file(resolvedPath);
	const existingContent = (await file.exists())
		? await file.arrayBuffer()
		: new ArrayBuffer(0);

	// Combine existing content with new chunks
	const allChunks: StreamChunk[] = [];

	if (existingContent.byteLength > 0) {
		allChunks.push(existingContent);
	}

	allChunks.push(...chunks);

	return writeStream(resolvedPath, allChunks, options);
};

/**
 * Copies file using streaming (efficient for large files)
 */
export const copyFileStream = async (
	sourcePath: string,
	destinationPath: string,
	options: FileSinkOptions = {},
): StreamOperationResult => {
	const resolvedSource = resolvePath(sourcePath);
	const sourceFile = Bun.file(resolvedSource);

	if (!(await sourceFile.exists())) {
		throw createFileManagerError(
			"SOURCE_NOT_FOUND",
			`Source file not found: ${sourcePath}`,
			resolvedSource,
			"copyFileStream",
		);
	}

	// Stream the source file to destination
	const sourceStream = sourceFile.stream();
	const writer = await createFileWriter(destinationPath, options);

	let totalBytes = 0;

	try {
		const reader = sourceStream.getReader();

		while (true) {
			const { done, value } = await reader.read();

			if (done) break;

			const bytesWritten = writer.write(value);
			totalBytes += bytesWritten;
		}

		await writer.flush();
		await writer.end();

		return totalBytes;
	} catch (error) {
		try {
			await writer.end(error as Error);
		} catch {
			// Ignore cleanup errors
		}
		throw error;
	}
};

/**
 * Reads file in chunks using streaming
 */
export const readFileStream = async (
	path: string,
	chunkProcessor: (chunk: Uint8Array) => Promise<void>,
): Promise<void> => {
	const resolvedPath = resolvePath(path);
	const file = Bun.file(resolvedPath);

	if (!(await file.exists())) {
		throw createFileManagerError(
			"FILE_NOT_FOUND",
			`File not found: ${path}`,
			resolvedPath,
			"readFileStream",
		);
	}

	const stream = file.stream();
	const reader = stream.getReader();

	try {
		while (true) {
			const { done, value } = await reader.read();

			if (done) break;

			await chunkProcessor(value);
		}
	} finally {
		reader.releaseLock();
	}
};
