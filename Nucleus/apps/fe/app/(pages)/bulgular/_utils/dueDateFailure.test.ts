import { describe, expect, it } from "bun:test";
import { DUE_DATE_FAILED, dueDateFailureMessage } from "./dueDateFailure";

const REJECTED_PLAN_REFUSAL =
  "Bu denetim düzeltme için geri gönderildi; düzeltmeyi yalnız planın ekibi ve Merkez Ekip yapabilir. Düzeltmeyi planın ekibinden isteyin.";

describe("dueDateFailureMessage", () => {
  it("shows the server's refusal, so the person learns who may change the date", () => {
    const message = dueDateFailureMessage([REJECTED_PLAN_REFUSAL]);
    expect(message.startsWith(`${DUE_DATE_FAILED}: `)).toBe(true);
    expect(message).toContain(REJECTED_PLAN_REFUSAL);
  });

  it("says the list went back to the old date", () => {
    expect(dueDateFailureMessage([REJECTED_PLAN_REFUSAL])).toContain("eski termine döndü");
  });

  it("joins several reasons and drops blank ones", () => {
    const message = dueDateFailureMessage(["Birinci sebep.", "  ", "İkinci sebep."]);
    expect(message).toContain("Birinci sebep. İkinci sebep.");
  });

  it("says what to do when the server gave no reason", () => {
    for (const reasons of [[], [""], ["   "]]) {
      const message = dueDateFailureMessage(reasons);
      expect(message).toContain(DUE_DATE_FAILED);
      expect(message).toContain("tekrar deneyin");
    }
  });
});

describe("the register's date cell shows the refusal", () => {
  it("handleDueDateChange toasts the server's reasons before it reloads", async () => {
    const source = (await Bun.file(new URL("../page.tsx", import.meta.url)).text()).replace(/\r\n/g, "\n");
    const start = source.indexOf("const handleDueDateChange");
    const end = source.indexOf("// status update", start);
    if (start < 0 || end < 0) throw new Error("page.tsx: handleDueDateChange was not found");
    const body = source.slice(start, end);
    expect(body).toContain("toast.error(dueDateFailureMessage(readServerReasons(err)))");
    expect(body.indexOf("toast.error(")).toBeLessThan(body.indexOf("serverList.reload()"));
  });
});
