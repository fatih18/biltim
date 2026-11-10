import { describe, expect, it } from "bun:test";
import {
  LIST_PAGE_SIZE,
  NEWEST_FIRST,
  isAbortError,
  type ListRow,
  type PageRequest,
  type PageStarter,
} from "@/app/_utils/readAllPages";
import { readTeamsAndMembers, type TeamsReadSubject } from "./readTeams";

const rowsOf = (count: number, prefix: string): ListRow[] =>
  Array.from({ length: count }, (_, i) => ({ id: `${prefix}-${String(i).padStart(4, "0")}`, team_id: `t-${i % 3}` }));

/** A table the way nucleus serves it: 200 rows a page at most, whatever `limit` says. */
function serve(table: ListRow[], asked: PageRequest["payload"][] = []): PageStarter {
  return ({ payload, onAfterHandle }) => {
    asked.push(payload);
    const size = Math.min(payload.limit, LIST_PAGE_SIZE);
    const items = table.slice((payload.page - 1) * size, payload.page * size);
    onAfterHandle({ data: { data: items, pagination: { hasNext: payload.page * size < table.length } } });
  };
}

const refuse: PageStarter = ({ onErrorHandle }) => onErrorHandle(new Error("refused"));
const cancelled: PageStarter = ({ onErrorHandle }) => onErrorHandle(new DOMException("cancelled", "AbortError"));

type Outcome = {
  done: { teams: ListRow[]; members: ListRow[] }[];
  failed: { subject: TeamsReadSubject; error: object }[];
};

function run(startTeams: PageStarter, startMembers: PageStarter): Outcome {
  const outcome: Outcome = { done: [], failed: [] };
  readTeamsAndMembers({
    startTeams,
    startMembers,
    onDone: (lists) => outcome.done.push(lists),
    onError: (subject, error) => outcome.failed.push({ subject, error }),
  });
  return outcome;
}

describe("readTeamsAndMembers", () => {
  it("reads every page of both lists, not the first 200 rows of each", () => {
    const teamReads: PageRequest["payload"][] = [];
    const memberReads: PageRequest["payload"][] = [];
    const outcome = run(serve(rowsOf(230, "team"), teamReads), serve(rowsOf(450, "member"), memberReads));

    expect(outcome.failed).toEqual([]);
    expect(outcome.done).toHaveLength(1);
    expect(outcome.done[0]?.teams).toHaveLength(230);
    expect(outcome.done[0]?.members).toHaveLength(450);
    expect(teamReads.map((p) => p.page)).toEqual([1, 2]);
    expect(memberReads.map((p) => p.page)).toEqual([1, 2, 3]);
    expect(outcome.done[0]?.members.some((m) => m.id === "member-0449")).toBe(true);
  });

  it("asks for pages of the size the server gives, in a tie-breaking newest-first order", () => {
    const teamReads: PageRequest["payload"][] = [];
    const memberReads: PageRequest["payload"][] = [];
    run(serve(rowsOf(3, "team"), teamReads), serve(rowsOf(3, "member"), memberReads));
    for (const read of [...teamReads, ...memberReads]) {
      expect(read.limit).toBe(LIST_PAGE_SIZE);
      expect(read.sort).toEqual(NEWEST_FIRST);
    }
  });

  it("answers with empty lists when there are no teams yet", () => {
    const outcome = run(serve([]), serve([]));
    expect(outcome.done).toEqual([{ teams: [], members: [] }]);
    expect(outcome.failed).toEqual([]);
  });

  it("reports the teams list when it fails, and never reads the members", () => {
    const memberReads: PageRequest["payload"][] = [];
    const outcome = run(refuse, serve(rowsOf(3, "member"), memberReads));
    expect(outcome.done).toEqual([]);
    expect(outcome.failed.map((f) => f.subject)).toEqual(["teams"]);
    expect(memberReads).toEqual([]);
  });

  it("reports the members list when it fails, and hands on no teams without their members", () => {
    const outcome = run(serve(rowsOf(3, "team")), refuse);
    expect(outcome.done).toEqual([]);
    expect(outcome.failed.map((f) => f.subject)).toEqual(["members"]);
  });

  it("does not use half of the members: a page that fails after the first gives nothing", () => {
    let page = 0;
    const secondFails: PageStarter = (request) => {
      page += 1;
      if (page === 1) serve(rowsOf(450, "member"))(request);
      else refuse(request);
    };
    const outcome = run(serve(rowsOf(3, "team")), secondFails);
    expect(outcome.done).toEqual([]);
    expect(outcome.failed.map((f) => f.subject)).toEqual(["members"]);
  });

  it("hands a cancelled request on as such, so the tab can stay quiet about it", () => {
    const outcome = run(cancelled, serve(rowsOf(3, "member")));
    expect(outcome.failed).toHaveLength(1);
    const error = outcome.failed[0]?.error;
    expect(error !== undefined && isAbortError(error)).toBe(true);
  });
});
