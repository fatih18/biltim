/*
 * What the photo-first tests share (photoFirst.test.ts, rememberingUpload.test.ts):
 * a few questions that do and do not demand a photo, and an uploader that fails
 * on request and records what it was asked to send.
 */
import type { Question, Step } from "../constants";
import type { UploadedRef } from "./photoFirst";

export const steps: Step[] = [
  { code: "S1", title: "1 - Sınıflandırma", maxScore: 20, order: 1 },
  { code: "S3", title: "3 - Temizlik", maxScore: 20, order: 3 },
];

const question = (id: string, stepCode: Question["stepCode"], order: number, requirePhoto?: boolean): Question => ({
  id,
  stepCode,
  order,
  text: `Soru ${id}`,
  maxScore: 5,
  requireExplanation: true,
  ...(requirePhoto === undefined ? {} : { requirePhoto }),
});

/** Two questions that demand a photo, one that explicitly does not, one that never said. */
export const q12 = question("S1-Q2", "S1", 2, true);
export const q31 = question("S3-Q1", "S3", 1, true);
export const q13 = question("S1-Q3", "S1", 3, false);
export const q14 = question("S1-Q4", "S1", 4);
export const questions = [q12, q31, q13, q14];

export const file = (name: string) => new File(["x"], name, { type: "image/jpeg" });

export type Up = UploadedRef & { name: string };

/** An uploader that fails for the named files in the given way, and records the files it was asked for. */
export function fakeUpload(failing: Record<string, "throw" | "empty"> = {}) {
  const calls: string[] = [];
  const upload = async (f: File): Promise<Up | undefined> => {
    calls.push(f.name);
    const mode = failing[f.name];
    if (mode === "throw") throw new Error("File upload failed (503): unavailable");
    if (mode === "empty") return undefined;
    return { fileId: `id-${f.name}`, name: f.name };
  };
  return { upload, calls };
}
