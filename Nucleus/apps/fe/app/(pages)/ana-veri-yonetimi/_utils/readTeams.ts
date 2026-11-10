import { NEWEST_FIRST, readAllPages, type ListRow, type PageStarter } from "@/app/_utils/readAllPages";
import type { ReadSubject } from "./readFailure";

/*
 * The teams tab's two lists, every page of both.
 *
 * nucleus gives at most 200 rows a page whatever `limit` says. The tab asked
 * for `limit: 1000` teams and `limit: 5000` members and kept the first answer,
 * so a member past the 200th row vanished from its team's card and could be
 * added to that team a second time. Both lists are read page by page now,
 * and a list that failed is reported as that list: the tab never shows teams
 * next to a members list it could not read.
 */

/** The list whose read failed: the key of its wording in `readFailure.ts`. */
export type TeamsReadSubject = Extract<ReadSubject, "teams" | "members">;

export type TeamsRead = {
  startTeams: PageStarter;
  startMembers: PageStarter;
  /** Both lists, complete. */
  onDone: (lists: { teams: ListRow[]; members: ListRow[] }) => void;
  /** Once, with the list that failed; a cancelled request arrives here too (see `isAbortError`). */
  onError: (subject: TeamsReadSubject, error: object) => void;
};

/** Teams first, then members; `onDone` only when both were read in full. */
export function readTeamsAndMembers({ startTeams, startMembers, onDone, onError }: TeamsRead): void {
  readAllPages({
    start: startTeams,
    payload: { sort: NEWEST_FIRST },
    onDone: (teams) => {
      readAllPages({
        start: startMembers,
        payload: { sort: NEWEST_FIRST },
        onDone: (members) => onDone({ teams, members }),
        onError: (error) => onError("members", error),
      });
    },
    onError: (error) => onError("teams", error),
  });
}
