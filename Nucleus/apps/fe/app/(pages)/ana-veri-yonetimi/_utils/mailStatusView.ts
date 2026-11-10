/*
 * What the mail status line reads out of `GET /biltim/mail/status`
 * (be-nucleus/src/mail/status.ts, `MailStatusData`).
 *
 * The action layer hands the body over untyped (its success type is open on
 * purpose, see lib/api/endpoints.nucleus.ts), so the line narrows it here
 * instead of casting it: a field that is missing or of the wrong kind makes the
 * whole answer unreadable, rather than showing a made-up zero as if it were a
 * count. The answer may arrive as the status itself or, from an older client
 * layer, wrapped once more as `{ success, data }`; both are read.
 */

/** A JSON value, the widest thing a response body can be. */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

type JsonObject = { [key: string]: Json };

export type MailProvider = "smtp" | "azure" | "gmail";

export type MailStatusView = {
  /** A provider is configured and can send. */
  available: boolean;
  /**
   * A provider is switched on (the SMTP values are filled in) whether or not it could start. With `available` false
   * and `mailerInstalled` false the server is waiting for the nodemailer package. False when the server does not say.
   */
  providerConfigured: boolean;
  /** The nodemailer package is installed on the server. True when the server does not say (an older backend). */
  mailerInstalled: boolean;
  provider: MailProvider | null;
  /** Empty when the provider did not say. */
  senderAddress: string;
  /** How long a plan counts as new, in hours. */
  windowHours: number;
  /** Sends a plan gets before it is reported as failed. */
  maxAttempts: number;
  /** How many days back the expired count looks. */
  expiredDays: number;
  pending: number;
  failed: number;
  expired: number;
};

function isObject(value: Json | null | undefined): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A whole number of zero or more, or null when the field is not one. */
function countOf(value: Json | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
}

/** A flag the server may not send yet: anything but a real boolean reads as `fallback`, so an older backend still shows the old line. */
function flagOf(value: Json | undefined, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function providerOf(value: Json | undefined): MailProvider | null {
  return value === "smtp" || value === "azure" || value === "gmail" ? value : null;
}

/** The status object inside the body, whichever way it arrived. */
function statusObject(body: Json | null | undefined): JsonObject | null {
  if (!isObject(body)) return null;
  const inner = body.data;
  if (isObject(inner) && "available" in inner) return inner;
  return "available" in body ? body : null;
}

export function readMailStatus(body: Json | null | undefined): MailStatusView | null {
  const status = statusObject(body);
  if (!status) return null;
  const available = status.available;
  if (typeof available !== "boolean") return null;
  const windowHours = countOf(status.windowHours);
  const maxAttempts = countOf(status.maxAttempts);
  const expiredDays = countOf(status.expiredDays);
  const pending = countOf(status.pending);
  const failed = countOf(status.failed);
  const expired = countOf(status.expired);
  if (
    windowHours === null ||
    maxAttempts === null ||
    expiredDays === null ||
    pending === null ||
    failed === null ||
    expired === null
  ) {
    return null;
  }
  const sender = status.senderAddress;
  return {
    available,
    providerConfigured: flagOf(status.providerConfigured, false),
    mailerInstalled: flagOf(status.mailerInstalled, true),
    provider: providerOf(status.provider),
    senderAddress: typeof sender === "string" ? sender.trim() : "",
    windowHours,
    maxAttempts,
    expiredDays,
    pending,
    failed,
    expired,
  };
}
