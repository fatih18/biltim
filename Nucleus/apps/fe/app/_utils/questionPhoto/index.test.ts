import { describe, expect, it } from "bun:test";
import { readRequirePhoto } from "./index";

describe("readRequirePhoto: the one reader both screens use (R72)", () => {
  it("is on for an explicit true, and for the text a layer may have made of it", () => {
    expect(readRequirePhoto(true)).toBe(true);
    expect(readRequirePhoto("true")).toBe(true);
  });

  it("is off for every question that has no value yet: the existing ones", () => {
    expect(readRequirePhoto(undefined)).toBe(false);
    expect(readRequirePhoto(null)).toBe(false);
  });

  it("is off for false and for anything that merely looks truthy", () => {
    expect(readRequirePhoto(false)).toBe(false);
    expect(readRequirePhoto("false")).toBe(false);
    expect(readRequirePhoto("TRUE")).toBe(false);
    expect(readRequirePhoto(1)).toBe(false);
    expect(readRequirePhoto("yes")).toBe(false);
    expect(readRequirePhoto("")).toBe(false);
  });
});

describe("both screens read the column through it", () => {
  const read = async (path: string) => (await Bun.file(new URL(path, import.meta.url)).text()).replace(/\r\n/g, "\n");

  it("the audit form maps the question's column with it, not with a strict comparison", async () => {
    const page = await read("../../(pages)/denetim/page.tsx");
    expect(page).toContain("requirePhoto: readRequirePhoto(q.require_photo)");
    expect(page).toContain("from '@/app/_utils/questionPhoto'");
    expect(page).not.toContain("require_photo === true");
  });

  it("the master-data screen maps the question's column with it", async () => {
    const panel = await read("../../(pages)/ana-veri-yonetimi/components/QuestionsPanel.tsx");
    expect(panel).toContain("requirePhoto: readRequirePhoto(q.require_photo)");
    expect(panel).toContain('from "@/app/_utils/questionPhoto"');
    expect(panel).not.toContain("require_photo === true");
  });
});
