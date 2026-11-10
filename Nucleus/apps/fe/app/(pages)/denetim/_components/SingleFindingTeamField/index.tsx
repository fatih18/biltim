type SingleFindingTeamFieldProps = {
  /** The team(s) to show, already joined; empty when the person has none (see _utils/userTeams). */
  team: string;
};

/*
 * The single-finding modal's read-only "Ekip" (R19). It shows the person's
 * real audit team(s), or the plan's team inside an audit. With no team there
 * is nothing true to show, so the field is not rendered at all: the old
 * fallback was the name of a role, which the customer read as a team.
 */
export function SingleFindingTeamField({ team }: SingleFindingTeamFieldProps) {
  if (!team) return null;
  return (
    <div>
      <label htmlFor="single-finding-team" className="mb-1 block font-medium text-slate-700 dark:text-slate-300">
        Ekip
      </label>
      <input
        id="single-finding-team"
        type="text"
        value={team}
        readOnly
        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 opacity-90 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200"
      />
    </div>
  );
}
