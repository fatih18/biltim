import { describe, expect, it } from "bun:test";
import {
  type HeldSend,
  type HeldSendStore,
  type StoredHeldSend,
  forgetHeldSend,
  heldGapOf,
  heldSendKey,
  recallHeldSend,
  rememberHeldSend,
  validHeldSend,
} from "./heldSend";

const held: HeldSend = {
  planId: "plan-1",
  auditId: "audit-1",
  kind: "unsent",
  text: "Denetim kaydedildi ancak plan onaya gönderilemedi.",
};

/** A key-value table in memory, standing for the page's Dexie `snapshots`. */
function memoryStore(): HeldSendStore & { rows: Map<string, StoredHeldSend> } {
  const rows = new Map<string, StoredHeldSend>();
  return {
    rows,
    read: async (key) => rows.get(key) ?? null,
    write: async (key, value) => {
      rows.set(key, { ...value });
    },
    remove: async (key) => {
      rows.delete(key);
    },
  };
}

const brokenStore: HeldSendStore = {
  read: async () => {
    throw new Error("store closed");
  },
  write: async () => {
    throw new Error("quota exceeded");
  },
  remove: async () => {
    throw new Error("store closed");
  },
};

describe("a held send survives leaving the screen", () => {
  it("is remembered per plan and found again when that plan is opened", async () => {
    const store = memoryStore();
    await rememberHeldSend(store, held);
    expect(store.rows.has(heldSendKey("plan-1"))).toBe(true);
    expect(await recallHeldSend(store, "plan-1")).toEqual(held);
    expect(await recallHeldSend(store, "plan-2")).toBeNull();
  });

  it("two plans hold their own audit", async () => {
    const store = memoryStore();
    await rememberHeldSend(store, held);
    await rememberHeldSend(store, { ...held, planId: "plan-2", auditId: "audit-2" });
    expect((await recallHeldSend(store, "plan-1"))?.auditId).toBe("audit-1");
    expect((await recallHeldSend(store, "plan-2"))?.auditId).toBe("audit-2");
  });

  it("is forgotten once the stamp went through, and only for that plan", async () => {
    const store = memoryStore();
    await rememberHeldSend(store, held);
    await rememberHeldSend(store, { ...held, planId: "plan-2" });
    await forgetHeldSend(store, "plan-1");
    expect(await recallHeldSend(store, "plan-1")).toBeNull();
    expect(await recallHeldSend(store, "plan-2")).not.toBeNull();
  });

  it("a second hold for the same plan replaces the first (a retry that was refused again with another reason)", async () => {
    const store = memoryStore();
    await rememberHeldSend(store, held);
    await rememberHeldSend(store, { ...held, text: "Başka bir sebep." });
    expect((await recallHeldSend(store, "plan-1"))?.text).toBe("Başka bir sebep.");
  });

  it("gives back the message that stays on the page, with its kind", () => {
    expect(heldGapOf(held)).toEqual({ kind: "unsent", text: held.text });
    expect(heldGapOf({ ...held, kind: "incomplete" }).kind).toBe("incomplete");
  });
});

describe("validHeldSend never guesses", () => {
  it("rejects a missing record, another plan's record and records with a blank audit or message", () => {
    expect(validHeldSend(null, "plan-1")).toBeNull();
    expect(validHeldSend({ ...held }, "plan-2")).toBeNull();
    expect(validHeldSend({ ...held, auditId: "  " }, "plan-1")).toBeNull();
    expect(validHeldSend({ ...held, auditId: undefined }, "plan-1")).toBeNull();
    expect(validHeldSend({ ...held, text: "" }, "plan-1")).toBeNull();
    expect(validHeldSend({}, "plan-1")).toBeNull();
  });

  it("reads an unknown kind as 'unsent', the safe label", () => {
    expect(validHeldSend({ ...held, kind: "weird" }, "plan-1")?.kind).toBe("unsent");
    expect(validHeldSend({ ...held, kind: "incomplete" }, "plan-1")?.kind).toBe("incomplete");
  });
});

describe("a store that fails never fails the send", () => {
  it("rememberHeldSend, recallHeldSend and forgetHeldSend swallow the error (and log it)", async () => {
    const warnings: string[] = [];
    const warn = console.warn;
    console.warn = (message: string) => {
      warnings.push(message);
    };
    try {
      await rememberHeldSend(brokenStore, held);
      expect(await recallHeldSend(brokenStore, "plan-1")).toBeNull();
      await forgetHeldSend(brokenStore, "plan-1");
    } finally {
      console.warn = warn;
    }
    expect(warnings).toEqual(["held send not remembered", "held send not forgotten"]);
  });
});
