"use client";

import { useGenericApiActions } from "@/app/_hooks/UseGenericApiStore";

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
    const actions = useGenericApiActions();

    // Hook her kullanıldığında ADD_FILE config'ini bir kere görelim
    console.log("[useUploadAnswerPhoto] actions.ADD_FILE =", actions.ADD_FILE);

    const uploadAnswerPhoto = async ({
        file,
    }: UploadAnswerPhotoArgs): Promise<UploadedFileInfo | undefined> => {
        if (!file) return;

        if (!actions.ADD_FILE) {
            console.error("[useUploadAnswerPhoto] ADD_FILE action'ı bulunamadı");
            throw new Error("ADD_FILE action not available");
        }

        const formData = new FormData();
        formData.append("files", file); // ⬅️ önemli kısım
        formData.append("type", "image");
        formData.append("original_name", file.name);

        console.log(
            "[useUploadAnswerPhoto] Upload starting. File:",
            {
                name: file.name,
                size: file.size,
                type: file.type,
            }
        );

        const fileResp: any = await new Promise((resolve, reject) => {
            actions.ADD_FILE!.start({
                payload: formData,
                onAfterHandle: (data) => {
                    console.log(
                        "[useUploadAnswerPhoto] onAfterHandle raw response:",
                        data
                    );

                    if (!data) {
                        console.error(
                            "[useUploadAnswerPhoto] No file data returned from ADD_FILE"
                        );
                        reject(new Error("No file data returned"));
                        return;
                    }

                    console.log(
                        "[useUploadAnswerPhoto] Upload successful (raw response):",
                        data
                    );
                    resolve(data);
                },
                onErrorHandle: (error: any) => {
                    console.error(
                        "[useUploadAnswerPhoto] Upload failed (raw error object):",
                        error
                    );

                    try {
                        if (error?.status) {
                            console.error(
                                "[useUploadAnswerPhoto] Upload failed status:",
                                error.status
                            );
                        }
                        if (error?.url) {
                            console.error(
                                "[useUploadAnswerPhoto] Upload failed URL:",
                                error.url
                            );
                        }
                    } catch {
                        // yut
                    }

                    // Eğer wrapper error.response gibi bir şey taşıyorsa body'yi de loglamayı dene
                    const resp = (error as any)?.response;
                    if (resp && typeof resp.text === "function") {
                        resp
                            .text()
                            .then((bodyText: string) => {
                                console.error(
                                    "[useUploadAnswerPhoto] Upload failed response body:",
                                    bodyText
                                );
                            })
                            .catch((e: any) => {
                                console.error(
                                    "[useUploadAnswerPhoto] Failed to read error.response.text():",
                                    e
                                );
                            });
                    }

                    reject(error);
                },
            });
        });

        console.log(
            "[useUploadAnswerPhoto] FILE CREATE RESPONSE (wrapped from ADD_FILE):",
            fileResp
        );

        /**
         * 🔍 ADD_FILE response'u farklı şekillerde geliyor olabilir:
         * - { data: { id, ... } }
         * - { data: [ { id, ... } ] }
         * - { data: { data: { id, ... } } }
         * - { data: { data: [ { id, ... } ] } }
         * - direkt { id, ... }
         */
        let raw: any =
            // generateResponse({ data: fileEntity }) varyasyonları
            fileResp?.data?.data?.[0] ??
            fileResp?.data?.data ??
            fileResp?.data?.[0] ??
            fileResp?.data ??
            fileResp?.file ??
            fileResp;

        console.log("[useUploadAnswerPhoto] FILE ENTITY (raw resolved):", raw);

        const fileId = raw?.id as string | undefined;

        if (!fileId) {
            console.error(
                "[useUploadAnswerPhoto] File upload başarısız. id dönmedi. raw entity:",
                raw
            );
            throw new Error("File upload failed: id missing");
        }

        const fileUrl =
            (raw?.file_url as string | undefined) ??
            (raw?.url as string | undefined) ??
            (raw?.path as string | undefined);

        if (!fileUrl) {
            // Artık hata fırlatmıyoruz; sadece bilgi amaçlı log
            console.warn(
                "[useUploadAnswerPhoto] File upload başarılı ama path/url dönmedi. raw:",
                raw
            );
        }

        const mimeType = (raw?.mime_type as string | undefined) ?? file.type;
        const sizeBytes = (raw?.size as number | undefined) ?? file.size;
        const originalName =
            (raw?.original_name as string | undefined) ?? file.name;

        const result: UploadedFileInfo = {
            fileId,
            fileUrl,
            mimeType,
            sizeBytes,
            originalName,
        };

        console.log("[useUploadAnswerPhoto] Parsed UploadedFileInfo:", result);

        return result;
    };

    return { uploadAnswerPhoto };
}
