import { describe, expect, it } from "bun:test";
import { NucleusEndpoints } from "./endpoints.nucleus";

describe("BILTIM_MAIL_STATUS", () => {
  it("is declared in the custom block as GET /biltim/mail/status, the path the backend serves", () => {
    const endpoint = NucleusEndpoints.BILTIM_MAIL_STATUS;
    expect(endpoint?.method).toBe("GET");
    expect(endpoint?.path).toBe("/biltim/mail/status");
  });
});
