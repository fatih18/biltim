import { describe, expect, it } from "bun:test";
import { type AuditHeaderFields, auditHeaderProblem } from "./auditHeaderCheck";

const whole: AuditHeaderFields = {
  teamName: "Ekip 1",
  department: "Kaynak Atölyesi",
  date: "2026-11-10",
  auditorName: "Ayşe Yılmaz",
};

describe("auditHeaderProblem", () => {
  it("passes a whole header", () => {
    expect(auditHeaderProblem(whole)).toBeNull();
  });

  it("says the team, location and date come from the plan when one of them is missing", () => {
    const text = "Ekip, Lokasyon ve Tarih alanları plan üzerinden otomatik gelmelidir.";
    expect(auditHeaderProblem({ ...whole, teamName: "" })).toBe(text);
    expect(auditHeaderProblem({ ...whole, department: "" })).toBe(text);
    expect(auditHeaderProblem({ ...whole, date: "" })).toBe(text);
  });

  it("says the auditor's name is required", () => {
    expect(auditHeaderProblem({ ...whole, auditorName: "" })).toBe("Denetimi Yapan alanı zorunludur.");
  });

  it("names the plan fields first when both are wrong", () => {
    expect(auditHeaderProblem({ ...whole, teamName: "", auditorName: "" })).toContain("plan üzerinden");
  });
});
