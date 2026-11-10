import { describe, expect, it } from "bun:test";
import { singleFindingTeam, teamDescriptionLines, teamNamesOfUser, withoutRoleAsTeam } from "./userTeams";

const ROLE = "Content Manager Core Team";

const teams = [
  { id: "T1", name: "Kuzey Ekibi", leader_user_id: "u-lead", is_active: true },
  { id: "T2", name: "Çelik Ekibi", leader_user_id: "u-other", is_active: true },
  { id: "T3", name: "Güney Ekibi", leader_user_id: "u-other", is_active: true },
  { id: "T4", name: "Eski Ekip", leader_user_id: "u-lead", is_active: false },
];
const members = [
  { team_id: "T2", user_id: "u-member", is_active: true },
  { team_id: "T3", user_id: "u-member", is_active: false },
  { team_id: "T1", user_id: "u-member", is_active: true },
  { team_id: "T4", user_id: "u-member", is_active: true },
];

describe("teamNamesOfUser — the person's real audit teams (R19)", () => {
  it("lists a team the person leads", () => {
    expect(teamNamesOfUser("u-lead", teams, members)).toEqual(["Kuzey Ekibi"]);
  });

  it("lists every team the person is an active member of, alphabetical the Turkish way", () => {
    expect(teamNamesOfUser("u-member", teams, members)).toEqual(["Çelik Ekibi", "Kuzey Ekibi"]);
  });

  it("leaves out a membership that is switched off and a team that is deactivated", () => {
    const names = teamNamesOfUser("u-member", teams, members);
    expect(names).not.toContain("Güney Ekibi");
    expect(names).not.toContain("Eski Ekip");
    expect(teamNamesOfUser("u-lead", teams, members)).not.toContain("Eski Ekip");
  });

  it("is empty for a person on no team — never a role name", () => {
    expect(teamNamesOfUser("u-nobody", teams, members)).toEqual([]);
    expect(teamNamesOfUser("", teams, members)).toEqual([]);
    expect(teamNamesOfUser(null, teams, members)).toEqual([]);
    expect(teamNamesOfUser("u-lead", [], [])).toEqual([]);
  });

  it("matches ids without caring about letter case or spaces", () => {
    expect(teamNamesOfUser(" U-LEAD ", teams, members)).toEqual(["Kuzey Ekibi"]);
    expect(teamNamesOfUser("u-member", [{ id: "t2", name: "Çelik Ekibi" }], [{ team_id: "T2", user_id: "U-MEMBER" }])).toEqual([
      "Çelik Ekibi",
    ]);
  });

  it("counts a person once per team even when they both lead it and are a member", () => {
    const both = [{ team_id: "T1", user_id: "u-lead", is_active: true }];
    expect(teamNamesOfUser("u-lead", teams, both)).toEqual(["Kuzey Ekibi"]);
  });

  it("skips a team with no name and shows two teams of one name once", () => {
    const odd = [
      { id: "A", name: null, leader_user_id: "u1" },
      { id: "B", name: "  ", leader_user_id: "u1" },
      { id: "C", name: "İzmir Ekibi", leader_user_id: "u1" },
      { id: "D", name: "izmir ekibi", leader_user_id: "u1" },
    ];
    expect(teamNamesOfUser("u1", odd, [])).toHaveLength(1);
  });
});

describe("singleFindingTeam — what the field and the description show", () => {
  it("on its own: the person's real teams joined with a comma", () => {
    expect(singleFindingTeam({ inAudit: false, planTeamName: "Kuzey Ekibi", userTeams: ["Çelik Ekibi", "Kuzey Ekibi"] })).toBe(
      "Çelik Ekibi, Kuzey Ekibi",
    );
    expect(singleFindingTeam({ inAudit: false, planTeamName: "", userTeams: ["Kuzey Ekibi"] })).toBe("Kuzey Ekibi");
  });

  it("on its own and in no team: nothing, so no field and no line", () => {
    expect(singleFindingTeam({ inAudit: false, planTeamName: ROLE, userTeams: [] })).toBe("");
  });

  it("inside an audit: the plan's own team, whatever teams the person is on", () => {
    expect(singleFindingTeam({ inAudit: true, planTeamName: " Kuzey Ekibi ", userTeams: ["Çelik Ekibi"] })).toBe("Kuzey Ekibi");
    expect(singleFindingTeam({ inAudit: true, planTeamName: "Kuzey Ekibi", userTeams: [] })).toBe("Kuzey Ekibi");
  });

  it("inside an audit with no usable plan team: nothing, never a role name or a dash", () => {
    for (const planTeamName of ["", "—", "-", "  ", null, undefined]) {
      expect(singleFindingTeam({ inAudit: true, planTeamName, userTeams: ["Çelik Ekibi"] })).toBe("");
    }
  });

  it("never lets a role name through as a team", () => {
    for (const inAudit of [true, false]) {
      const team = singleFindingTeam({ inAudit, planTeamName: "", userTeams: [] });
      expect(team).not.toContain(ROLE);
    }
  });
});

describe("teamDescriptionLines — the description's Ekip line", () => {
  it("is one line with a team and none without", () => {
    expect(teamDescriptionLines("Kuzey Ekibi")).toEqual(["Ekip: Kuzey Ekibi"]);
    expect(teamDescriptionLines("")).toEqual([]);
  });

  it("leaves the description without any Ekip line when the person is on no team", () => {
    const team = singleFindingTeam({ inAudit: false, planTeamName: "", userTeams: [] });
    const description = ["TEKİL BULGU", ...teamDescriptionLines(team), "Bulgu Tipi: Düzen", "Açıklama: Zemin yağlı"].join("\n");
    expect(description).not.toContain("Ekip:");
    expect(description).not.toContain(ROLE);
  });
});

describe("withoutRoleAsTeam — old single findings read without the role name", () => {
  const old = ["TEKİL BULGU", `Ekip: ${ROLE}`, "Bulgu Tipi: Düzen", "Açıklama: Zemin yağlı"].join("\n");

  it("drops an Ekip line that names a role", () => {
    expect(withoutRoleAsTeam(old)).toBe(["TEKİL BULGU", "Bulgu Tipi: Düzen", "Açıklama: Zemin yağlı"].join("\n"));
    for (const role of ["Super Admin", "Manager", "Field Manager", "Auditor", "godmin", "content manager core team"]) {
      expect(withoutRoleAsTeam(`A\nEkip: ${role}\nB`)).toBe("A\nB");
    }
  });

  it("keeps a real team's line and every other line", () => {
    const real = "TEKİL BULGU\nEkip: Kuzey Ekibi\nAçıklama: Ekip: Manager değil";
    expect(withoutRoleAsTeam(real)).toBe(real);
  });

  it("passes empty text through", () => {
    expect(withoutRoleAsTeam(null)).toBe("");
    expect(withoutRoleAsTeam(undefined)).toBe("");
    expect(withoutRoleAsTeam("")).toBe("");
  });
});

describe("withoutRoleAsTeam — the same roles and the same folding as the server (B7)", () => {
  const strip = (named: string) => withoutRoleAsTeam(`A\nEkip: ${named}\nB`);

  it("drops the Turkish aliases of the roles, the way the Excel register does", () => {
    for (const alias of ["Merkez Ekip", "Müdür", "Denetçi", "Saha Sorumlusu"]) {
      expect(strip(alias)).toBe("A\nB");
    }
  });

  it("folds Turkish capitals: İ and I, and the dotless ı, are the same letters as i", () => {
    for (const written of ["MERKEZ EKİP", "merkez ekip", "MÜDÜR", "SAHA SORUMLUSU", "DENETÇİ", "Saha  Sorumlusu", "SUPER ADMIN", "GODMİN"]) {
      expect(strip(written)).toBe("A\nB");
    }
  });

  it("keeps the line when it names a team that merely contains a role's word", () => {
    for (const team of ["Müdürlük Ekibi", "Merkez Ekip Destek", "Saha Ekibi", "Denetçi Takımı"]) {
      expect(strip(team)).toBe(`A\nEkip: ${team}\nB`);
    }
  });

  it("drops every role line of a description and leaves a Windows line break alone", () => {
    expect(withoutRoleAsTeam("TEKİL BULGU\nEkip: Müdür\nEkip: Kuzey Ekibi\nEkip: Auditor")).toBe("TEKİL BULGU\nEkip: Kuzey Ekibi");
    expect(withoutRoleAsTeam("TEKİL BULGU\r\nEkip: Merkez Ekip\r\nAçıklama: x")).toBe("TEKİL BULGU\r\nAçıklama: x");
  });
});
