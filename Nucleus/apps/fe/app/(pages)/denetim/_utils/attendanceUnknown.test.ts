import { describe, expect, it } from "bun:test";
import { initialAttendanceOf } from "./attendance";
import { ATTENDANCE_LABEL, noAnswersNotice } from "./attendanceText";

describe("initialAttendanceOf: the tick a correction opens with", () => {
  it("with a plan, attended unless the plan holds the tick's no next to a stored 0", () => {
    expect(initialAttendanceOf({ planFound: true, recorded: false, storedTotal: 0 })).toEqual({
      attended: false,
      unknown: false,
    });
    // An older plan's false next to points that were never zeroed is a guess, not the tick.
    expect(initialAttendanceOf({ planFound: true, recorded: false, storedTotal: 87.5 })).toEqual({
      attended: true,
      unknown: false,
    });
    for (const recorded of [true, null, undefined]) {
      expect(initialAttendanceOf({ planFound: true, recorded, storedTotal: 0 })).toEqual({
        attended: true,
        unknown: false,
      });
    }
  });

  it("without a plan, a stored 0 opens the box empty and says attendance is unknown", () => {
    expect(initialAttendanceOf({ planFound: false, recorded: undefined, storedTotal: 0 })).toEqual({
      attended: false,
      unknown: true,
    });
  });

  it("without a plan, points that were never zeroed mean attended and nothing is unknown", () => {
    expect(initialAttendanceOf({ planFound: false, recorded: undefined, storedTotal: 55 })).toEqual({
      attended: true,
      unknown: false,
    });
    // An audit row with no readable total is not a zero.
    expect(initialAttendanceOf({ planFound: false, recorded: undefined, storedTotal: Number.NaN })).toEqual({
      attended: true,
      unknown: false,
    });
  });
});

describe("noAnswersNotice when attendance is unknown", () => {
  const unknown = noAnswersNotice({ hadAnswers: false, initialAttended: false, attendanceUnknown: true, ruleApplies: true });

  it("does not claim the field manager did not attend", () => {
    expect(unknown).not.toContain("katılmadığı için");
    expect(unknown).not.toContain("katılmadığı");
    expect(unknown).toContain("bilinmiyor");
  });

  it("says what is wrong, what it means and what to do", () => {
    expect(unknown).toContain("soru yanıtı kayıtlı değil");
    expect(unknown).toContain("puan 0");
    expect(unknown).toContain(`"${ATTENDANCE_LABEL}"`);
  });

  it("is the same sentence whatever the box opened as, and silent when answers exist", () => {
    expect(noAnswersNotice({ hadAnswers: false, initialAttended: true, attendanceUnknown: true, ruleApplies: true })).toBe(
      unknown,
    );
    expect(noAnswersNotice({ hadAnswers: true, initialAttended: false, attendanceUnknown: true, ruleApplies: true })).toBe(
      "",
    );
  });

  it("still names the recorded no, and the old record, when attendance is known", () => {
    const notAttended = noAnswersNotice({
      hadAnswers: false,
      initialAttended: false,
      attendanceUnknown: false,
      ruleApplies: true,
    });
    const oldRecord = noAnswersNotice({
      hadAnswers: false,
      initialAttended: true,
      attendanceUnknown: false,
      ruleApplies: true,
    });
    expect(notAttended).toContain("katılmadığı için");
    expect(oldRecord).toContain("eski kayıt");
    expect(new Set([unknown, notAttended, oldRecord]).size).toBe(3);
  });
});

describe("noAnswersNotice where the attendance rule does not apply", () => {
  /*
   * A location with no field manager, no readable plan and a stored 0: the
   * page stores `attendanceUnknown && ruleApplies`, which is false here, and
   * the notice must not claim a field manager's absence either.
   */
  const noRule = noAnswersNotice({
    hadAnswers: false,
    initialAttended: false,
    attendanceUnknown: false,
    ruleApplies: false,
  });

  it("does not say attendance is unknown, nor that the field manager did not attend", () => {
    expect(noRule).not.toContain("bilinmiyor");
    expect(noRule).not.toContain("katılmadığı");
    expect(noRule).not.toContain(ATTENDANCE_LABEL);
  });

  it("is the old-record sentence", () => {
    expect(noRule).toBe(noAnswersNotice({ hadAnswers: false, initialAttended: true, attendanceUnknown: false, ruleApplies: true }));
  });
});
