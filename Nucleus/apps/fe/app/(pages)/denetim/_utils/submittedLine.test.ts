import { describe, expect, it } from "bun:test";
import { submittedLine } from "./submittedLine";

describe("submittedLine follows what happened to the form, not the connection", () => {
  it("says sent only for a form that was sent", () => {
    expect(submittedLine({ queued: false, online: true })).toBe("Form başarıyla gönderildi.");
  });

  it("says queued for a form stored offline", () => {
    expect(submittedLine({ queued: true, online: false })).toBe(
      "Form offline kuyruğa alındı (internet gelince gönderilecek).",
    );
  });

  it("never says sent for a form queued while online (the 'Kuyruğa al' button, a failed audit request)", () => {
    const text = submittedLine({ queued: true, online: true });
    expect(text).toContain("kuyruğa alındı");
    expect(text).toContain("henüz gönderilmedi");
    expect(text).not.toContain("başarıyla gönderildi");
  });
});
