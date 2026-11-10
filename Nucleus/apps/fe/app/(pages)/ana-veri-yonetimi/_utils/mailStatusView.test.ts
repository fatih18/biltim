import { describe, expect, it } from "bun:test";
import { type Json, readMailStatus } from "./mailStatusView";

const STATUS: { [key: string]: Json } = {
  available: true,
  provider: "smtp",
  senderAddress: "denetim@firma.example",
  windowHours: 48,
  maxAttempts: 5,
  pendingInvitations: 2,
  pendingCompletions: 1,
  failedInvitations: 1,
  failedCompletions: 0,
  expiredInvitations: 4,
  expiredCompletions: 1,
  expiredDays: 30,
  pending: 3,
  failed: 1,
  expired: 5,
};

describe("readMailStatus", () => {
  it("reads the status the action layer delivers", () => {
    expect(readMailStatus(STATUS)).toEqual({
      available: true,
      provider: "smtp",
      senderAddress: "denetim@firma.example",
      windowHours: 48,
      maxAttempts: 5,
      expiredDays: 30,
      pending: 3,
      failed: 1,
      expired: 5,
    });
  });

  it("reads it when it comes wrapped once more as { success, data }", () => {
    expect(readMailStatus({ success: true, data: STATUS })?.expired).toBe(5);
  });

  it("ignores the snake_case twins the layer adds beside every key", () => {
    const view = readMailStatus({ ...STATUS, sender_address: "baska@firma.example", window_hours: 1 });
    expect(view?.senderAddress).toBe("denetim@firma.example");
    expect(view?.windowHours).toBe(48);
  });

  it("reads a configured-off install: no provider, no address", () => {
    const view = readMailStatus({ ...STATUS, available: false, provider: null, senderAddress: "" });
    expect(view).toMatchObject({ available: false, provider: null, senderAddress: "" });
  });

  it("reads a provider it does not know as none, and a missing address as empty", () => {
    const { senderAddress: _dropped, ...withoutAddress } = STATUS;
    expect(readMailStatus({ ...withoutAddress, provider: "sendgrid" })).toMatchObject({ provider: null, senderAddress: "" });
  });

  it("is unreadable when there is no body, or it is not an object", () => {
    for (const body of [null, undefined, "ok", 3, true, [STATUS]]) {
      expect(readMailStatus(body)).toBeNull();
    }
  });

  it("is unreadable without the available flag, or with it as text", () => {
    const { available: _dropped, ...withoutFlag } = STATUS;
    expect(readMailStatus(withoutFlag)).toBeNull();
    expect(readMailStatus({ ...STATUS, available: "true" })).toBeNull();
  });

  it("is unreadable when any count is missing or not a count, rather than showing a made-up zero", () => {
    for (const key of ["windowHours", "maxAttempts", "expiredDays", "pending", "failed", "expired"]) {
      const { [key]: _dropped, ...without } = STATUS;
      expect(readMailStatus(without)).toBeNull();
      expect(readMailStatus({ ...STATUS, [key]: "3" })).toBeNull();
      expect(readMailStatus({ ...STATUS, [key]: -1 })).toBeNull();
      expect(readMailStatus({ ...STATUS, [key]: null })).toBeNull();
    }
  });

  it("keeps a real zero", () => {
    expect(readMailStatus({ ...STATUS, pending: 0, failed: 0, expired: 0 })).toMatchObject({ pending: 0, failed: 0, expired: 0 });
  });
});
