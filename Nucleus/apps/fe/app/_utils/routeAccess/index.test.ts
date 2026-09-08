import { describe, expect, it } from "bun:test";
import { canAccessRoute, normalizeRoleName, requirementFor } from "./index";

const BASIC = ["basic"];
const AUDITOR = ["Denetçi"];
const SUPER = ["Super Admin"];
const CONTENT_CORE = ["Content Manager Core Team"];
const MANAGER = ["manager"];

describe("normalizeRoleName", () => {
  it("folds case and collapses whitespace, because role names arrive both ways", () => {
    expect(normalizeRoleName("  Super   Admin ")).toBe("super admin");
    expect(normalizeRoleName("")).toBe("");
  });
});

describe("who may open the developer tooling", () => {
  // /generic-api calls arbitrary endpoints; /drizzle-tables draws the schema.
  it.each(["/generic-api", "/drizzle-tables", "/logs"])("%s is closed to a basic account", (p) => {
    expect(canAccessRoute(p, BASIC)).toBe(false);
    expect(canAccessRoute(p, AUDITOR)).toBe(false);
    expect(canAccessRoute(p, CONTENT_CORE)).toBe(false);
  });

  it("opens them to a super admin", () => {
    expect(canAccessRoute("/generic-api", SUPER)).toBe(true);
    expect(canAccessRoute("/drizzle-tables", SUPER)).toBe(true);
  });

  it("covers nested paths, not just the exact one", () => {
    expect(canAccessRoute("/drizzle-tables/users", BASIC)).toBe(false);
  });

  it("does not catch a different route that merely starts with the same letters", () => {
    // /logs must not gate /logistics.
    expect(requirementFor("/logistics")).toBeUndefined();
    expect(canAccessRoute("/logistics", BASIC)).toBe(true);
  });
});

describe("the rules the header already applied, now enforced", () => {
  it("mirrors canSeeUsersPage", () => {
    expect(canAccessRoute("/users", SUPER)).toBe(true);
    expect(canAccessRoute("/users", CONTENT_CORE)).toBe(true);
    expect(canAccessRoute("/kullanicilar", MANAGER)).toBe(false);
    expect(canAccessRoute("/users", AUDITOR)).toBe(false);
  });

  it("mirrors canSeeMasterMenus", () => {
    expect(canAccessRoute("/ana-veri-yonetimi", MANAGER)).toBe(true);
    expect(canAccessRoute("/iyilestirici-faaliyetler", CONTENT_CORE)).toBe(true);
    expect(canAccessRoute("/ana-veri-yonetimi", AUDITOR)).toBe(false);
  });
});

describe("the gate restricts and does not become a second allow-list", () => {
  it("leaves ordinary screens open to any signed-in user", () => {
    for (const p of ["/", "/denetim", "/profile"]) {
      expect(canAccessRoute(p, BASIC)).toBe(true);
      expect(canAccessRoute(p, AUDITOR)).toBe(true);
    }
  });

  it("refuses a covered route when the roles are not known yet", () => {
    // An empty role list is "we do not know", and the safe answer to that on an
    // administrator's screen is no.
    expect(canAccessRoute("/generic-api", [])).toBe(false);
    expect(canAccessRoute("/bulgular", [])).toBe(true);
  });
});

describe("the root account is never locked out of the tools for fixing things", () => {
  // Shipped wrong the first time: the rule looked for the role name "super
  // admin", and a godmin — whose role is named godmin, and who the backend lets
  // past every claim check — was sent back to the home page from /generic-api.
  it("lets the godmin ROLE through", () => {
    expect(canAccessRoute("/generic-api", ["godmin"])).toBe(true);
    expect(canAccessRoute("/drizzle-tables", ["godmin"])).toBe(true);
    expect(canAccessRoute("/users", ["godmin"])).toBe(true);
  });

  it("lets the god FLAG through whatever the role is called", () => {
    expect(canAccessRoute("/generic-api", ["basic"], true)).toBe(true);
    expect(canAccessRoute("/claims", [], true)).toBe(true);
  });

  it("still refuses the same paths without it", () => {
    expect(canAccessRoute("/generic-api", ["basic"], false)).toBe(false);
    expect(canAccessRoute("/generic-api", ["auditor"])).toBe(false);
  });
});

describe("the findings register, which the header used to guard separately", () => {
  // The header had its own route guard for this, disagreeing with the gate. The
  // rule itself is the product's: an account whose only role is auditor reads
  // findings through the audit, not the register.
  it("is closed to an auditor with no other role", () => {
    expect(canAccessRoute("/bulgular", AUDITOR)).toBe(false);
    expect(canAccessRoute("/bulgular", ["denetçi"])).toBe(false);
  });

  it("opens for an auditor who also carries a privileged role", () => {
    expect(canAccessRoute("/bulgular", ["Denetçi", "Manager"])).toBe(true);
    expect(canAccessRoute("/bulgular", ["Denetçi", "Field Manager"])).toBe(true);
    expect(canAccessRoute("/bulgular", ["Denetçi", "Super Admin"])).toBe(true);
  });

  it("opens for godmin, which the header's version had never heard of", () => {
    expect(canAccessRoute("/bulgular", ["godmin"])).toBe(true);
    expect(canAccessRoute("/bulgular", ["Denetçi"], true)).toBe(true);
  });

  it("opens for anyone who is not an auditor at all", () => {
    expect(canAccessRoute("/bulgular", BASIC)).toBe(true);
  });
});
