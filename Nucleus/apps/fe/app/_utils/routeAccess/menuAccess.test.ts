import { describe, expect, it } from "bun:test";
import { canSeeMasterMenus, canSeeUsersMenu, isAuditorOnlyAccount } from "./menuAccess";

const MERKEZ = ["Content Manager Core Team"];
const SUPER_ADMIN = ["Super Admin"];
const MUDUR = ["Manager"];
const AUDITOR = ["Auditor"];
const FIELD_MANAGER = ["Field Manager"];

describe("the godmin keeps every menu through the is_god flag (R27)", () => {
  it("with no role at all", () => {
    expect(canSeeUsersMenu([], true)).toBe(true);
    expect(canSeeMasterMenus([], true)).toBe(true);
  });

  it("with the flag and an unrelated role, the Users and master menus stay", () => {
    expect(canSeeUsersMenu(FIELD_MANAGER, true)).toBe(true);
    expect(canSeeMasterMenus(AUDITOR, true)).toBe(true);
  });

  it("is never an auditor-only account, whatever else it holds", () => {
    expect(isAuditorOnlyAccount(AUDITOR, true)).toBe(false);
  });

  it("with the godmin role and no flag", () => {
    expect(canSeeUsersMenu(["godmin"], false)).toBe(true);
    expect(canSeeMasterMenus(["godmin"], false)).toBe(true);
    expect(isAuditorOnlyAccount(["auditor", "godmin"], false)).toBe(false);
  });

  it("sees exactly what Merkez Ekip sees", () => {
    expect(canSeeUsersMenu(MERKEZ, false)).toBe(canSeeUsersMenu([], true));
    expect(canSeeMasterMenus(MERKEZ, false)).toBe(canSeeMasterMenus([], true));
    expect(isAuditorOnlyAccount([...AUDITOR, ...MERKEZ], false)).toBe(isAuditorOnlyAccount(AUDITOR, true));
  });
});

describe("everyone else is judged as the header always judged them", () => {
  it("Super Admin sees both", () => {
    expect(canSeeUsersMenu(SUPER_ADMIN, false)).toBe(true);
    expect(canSeeMasterMenus(SUPER_ADMIN, false)).toBe(true);
  });

  it("Müdür sees master data but not Users", () => {
    expect(canSeeUsersMenu(MUDUR, false)).toBe(false);
    expect(canSeeMasterMenus(MUDUR, false)).toBe(true);
  });

  it("an auditor and a field manager see neither", () => {
    for (const roles of [AUDITOR, FIELD_MANAGER]) {
      expect(canSeeUsersMenu(roles, false)).toBe(false);
      expect(canSeeMasterMenus(roles, false)).toBe(false);
    }
  });

  it("a role list that is not known yet shows nothing", () => {
    expect(canSeeUsersMenu([], false)).toBe(false);
    expect(canSeeMasterMenus([""], false)).toBe(false);
  });

  it("matches the Merkez Ekip role however it is spelled", () => {
    expect(canSeeUsersMenu(["Content Manager - Core Team"], false)).toBe(true);
    expect(canSeeMasterMenus(["  content   manager core team "], false)).toBe(true);
  });

  it("an auditor with no other role is auditor-only; Turkish name counts too", () => {
    expect(isAuditorOnlyAccount(AUDITOR, false)).toBe(true);
    expect(isAuditorOnlyAccount(["Denetçi"], false)).toBe(true);
  });

  it("an auditor who also holds another privileged role is not", () => {
    for (const other of [MERKEZ, SUPER_ADMIN, MUDUR, FIELD_MANAGER]) {
      expect(isAuditorOnlyAccount([...AUDITOR, ...other], false)).toBe(false);
    }
  });

  it("an account with no auditor role is not auditor-only", () => {
    expect(isAuditorOnlyAccount(FIELD_MANAGER, false)).toBe(false);
    expect(isAuditorOnlyAccount([], false)).toBe(false);
  });
});
