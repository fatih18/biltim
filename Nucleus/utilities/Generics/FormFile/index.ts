import fileManager from "@monorepo/file-manager";
import type { PgTransaction } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { type EntityInsertType, GenericAction } from "../GenericAction";

export type SharedPayload = {
	ip_address: string;
	user_agent: string;
	action_type: "UPDATE" | "INSERT" | "DELETE" | "TOGGLE";
	// biome-ignore lint/suspicious/noExplicitAny: <>
	tx?: PgTransaction<any, any, any>;
	user_id?: string;
	schema_name: string;
};

type CreatedFile = {
	dir: string;
	name: string;
	bytesWritten: number;
	mime_type: string;
	extension: string;
	fullPath: string;
};

type AcceptedFilesInput = File | File[] | FileList | null | undefined;

type StorageCategory =
	| "images"
	| "videos"
	| "audios"
	| "pdfs"
	| "spreadsheets"
	| "documents"
	| "archives"
	| "text"
	| "others";

const SPREADSHEET_MIME_TYPES: readonly string[] = [
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/vnd.oasis.opendocument.spreadsheet",
	"text/csv",
	"application/csv",
];

const DOCUMENT_EXTENSIONS: readonly string[] = ["doc", "docx", "odt", "rtf"];

const ARCHIVE_EXTENSIONS: readonly string[] = ["zip", "rar", "7z", "tar", "gz"];

function resolveStorageCategory(
	mimeType: string,
	extension: string,
): StorageCategory {
	const normalizedMime = mimeType.toLowerCase();
	const normalizedExtension = extension.toLowerCase();

	if (normalizedMime.startsWith("image/")) {
		return "images";
	}

	if (normalizedMime.startsWith("video/")) {
		return "videos";
	}

	if (normalizedMime.startsWith("audio/")) {
		return "audios";
	}

	if (normalizedMime === "application/pdf" || normalizedExtension === "pdf") {
		return "pdfs";
	}

	if (
		SPREADSHEET_MIME_TYPES.includes(normalizedMime) ||
		["xls", "xlsx", "ods", "csv"].includes(normalizedExtension)
	) {
		return "spreadsheets";
	}

	if (DOCUMENT_EXTENSIONS.includes(normalizedExtension)) {
		return "documents";
	}

	if (
		ARCHIVE_EXTENSIONS.includes(normalizedExtension) ||
		normalizedMime === "application/zip"
	) {
		return "archives";
	}

	if (normalizedMime.startsWith("text/") || normalizedExtension === "txt") {
		return "text";
	}

	return "others";
}

function isFile(value: unknown): value is File {
	if (!value || (typeof value !== "object" && typeof value !== "function")) {
		return false;
	}

	const candidate = value as File;
	return (
		typeof candidate.name === "string" &&
		typeof candidate.type === "string" &&
		typeof candidate.arrayBuffer === "function"
	);
}

function isFileList(value: unknown): value is FileList {
	if (!value || typeof value !== "object") {
		return false;
	}

	const candidate = value as FileList;
	return (
		typeof candidate.length === "number" && typeof candidate.item === "function"
	);
}

function normalizeFiles(files: AcceptedFilesInput): File[] {
	if (!files) {
		return [];
	}

	if (Array.isArray(files)) {
		return files;
	}

	if (isFileList(files)) {
		return Array.from(files);
	}

	if (isFile(files)) {
		return [files];
	}

	return [];
}

type CreateFilesFailure = {
	isSuccess: false;
	errors: unknown[];
	message: string;
	rollbackPerformed: boolean;
};

type CreateFilesSuccess = {
	isSuccess: true;
	data: Awaited<ReturnType<typeof GenericAction>>;
	createdFiles: string[];
	rollbackPerformed: false;
};

export type CreateFilesResult = CreateFilesSuccess | CreateFilesFailure;

export async function CreateFiles({
	files,
	userId,
	shared_payload,
	type,
}: {
	files: AcceptedFilesInput;
	userId?: string;
	shared_payload: SharedPayload;
	type: string;
}): Promise<CreateFilesResult> {
	const normalizedFiles = normalizeFiles(files);

	if (normalizedFiles.length === 0) {
		return {
			isSuccess: false,
			errors: [],
			message: "No files provided",
			rollbackPerformed: false,
		};
	}

	const createdFiles: CreatedFile[] = [];

	try {
		for (const file of normalizedFiles) {
			const filename = `${nanoid()}_${file.name}`;
			const arrayBuffer = await file.arrayBuffer();
			const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
			const category = resolveStorageCategory(file.type, extension);
			const dir = `./storage/${category}/${userId || "anonymous"}`;
			const fullPath = `${dir}/${filename}`;

			try {
				const bytesWritten = await fileManager.createFile({
					dir,
					name: filename,
					data: new Uint8Array(arrayBuffer),
					options: {
						type: file.type,
						createDir: true,
					},
				});

				createdFiles.push({
					dir,
					name: filename,
					bytesWritten,
					mime_type: file.type,
					extension,
					fullPath,
				});
			} catch (fileError) {
				await rollbackFiles(createdFiles);
				throw new Error(
					`Failed to create file ${file.name}: ${String(fileError)}`,
				);
			}
		}

		const bulk_mode = createdFiles.length > 1;

		const data = bulk_mode
			? createdFiles.map((file) => ({
					name: file.name,
					original_name: file.name.split("_").slice(1).join("_") || file.name,
					type,
					path: file.dir,
					size: file.bytesWritten,
					mime_type: file.mime_type,
					extension: file.extension,
					uploaded_by: userId,
				}))
			: (() => {
					const [firstFile] = createdFiles;
					if (!firstFile) {
						throw new Error("No file metadata available after upload");
					}

					return {
						name: firstFile.name,
						original_name:
							firstFile.name.split("_").slice(1).join("_") || firstFile.name,
						type,
						path: firstFile.dir,
						size: firstFile.bytesWritten,
						mime_type: firstFile.mime_type,
						extension: firstFile.extension,
						uploaded_by: userId,
					};
				})();

		const fileRecords = await GenericAction({
			...shared_payload,
			table_name: "T_Files",
			data: data as EntityInsertType<"T_Files">,
			bulk_mode,
		});

		return {
			isSuccess: true,
			data: fileRecords,
			createdFiles: createdFiles.map((file) => file.fullPath),
			rollbackPerformed: false,
		};
	} catch (error) {
		try {
			await rollbackFiles(createdFiles);
		} catch (rollbackError) {
			console.error("File rollback failed:", rollbackError);
		}

		console.log("error", error);

		return {
			isSuccess: false,
			errors: [error],
			message: "Failed to create files",
			rollbackPerformed: true,
		};
	}
}

/**
 * Oluşturulan dosyaları siler (rollback)
 */
async function rollbackFiles(createdFiles: CreatedFile[]): Promise<void> {
	if (createdFiles.length === 0) {
		return;
	}

	const deletePromises = createdFiles.map(async (file) => {
		try {
			const exists = await fileManager.exists(file.fullPath);
			if (exists) {
				await fileManager.deleteFile(file.fullPath);
			}
		} catch (deleteError) {
			console.error(
				`✗ Failed to delete file during rollback: ${file.fullPath}`,
				deleteError,
			);
		}
	});

	await Promise.all(deletePromises);
}

// Utility: Bulk file rollback for external use
export async function rollbackFilesByPaths(filePaths: string[]): Promise<void> {
	const deletePromises = filePaths.map(async (filePath) => {
		try {
			const exists = await fileManager.exists(filePath);
			if (exists) {
				await fileManager.deleteFile(filePath);
			}
		} catch (error) {
			console.error(`✗ Failed to cleanup file: ${filePath}`, error);
		}
	});

	await Promise.all(deletePromises);
}
