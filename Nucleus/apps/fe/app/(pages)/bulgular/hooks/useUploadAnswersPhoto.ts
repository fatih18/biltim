"use client";

type UploadAnswerPhotoArgs = {
    file: File;
};

export type UploadedFileInfo = {
    fileId: string;
    fileUrl?: string;
    mimeType: string;
    sizeBytes: number;
    originalName: string;
};

export function useUploadAnswerPhoto() {
    const uploadAnswerPhoto = async ({
        file,
    }: UploadAnswerPhotoArgs): Promise<UploadedFileInfo | undefined> => {
        if (!file) return;

        const formData = new FormData();
        formData.append("files", file, file.name);
        formData.append("type", "image");

        const res = await fetch("/api/upload-file", {
            method: "POST",
            body: formData,
        });

        if (!res.ok) {
            const errText = await res.text().catch(() => res.statusText);
            throw new Error(`File upload failed (${res.status}): ${errText}`);
        }

        const json = await res.json();

        let raw: any =
            json?.data?.data?.[0] ??
            json?.data?.data ??
            json?.data?.[0] ??
            json?.data ??
            json;

        const fileId = raw?.id as string | undefined;

        if (!fileId) {
            throw new Error("File upload failed: id missing in response");
        }

        const fileUrl =
            (raw?.file_url as string | undefined) ??
            (raw?.url as string | undefined) ??
            (raw?.path as string | undefined);

        const mimeType = (raw?.mime_type as string | undefined) ?? file.type;
        const sizeBytes = (raw?.size as number | undefined) ?? file.size;
        const originalName =
            (raw?.original_name as string | undefined) ?? file.name;

        return { fileId, fileUrl, mimeType, sizeBytes, originalName };
    };

    return { uploadAnswerPhoto };
}
