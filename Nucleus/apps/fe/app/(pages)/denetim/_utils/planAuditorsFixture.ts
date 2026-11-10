import { buildTeamMemberOptions } from "./planAuditors";

/*
 * The Oksijen team of the customer's screenshot, for the planAuditors tests:
 * a leader, two active members, a member who was removed (Özge Neccar) and a
 * person of another team.
 */
export const OKSIJEN = "t-oksijen";

export const teams = [
  { id: OKSIJEN, leader_user_id: "u-lead" },
  { id: "t-other", leader_user_id: "u-central" },
];

export const users = new Map([
  ["u-lead", "Mehmet Lider"],
  ["u-sude", "Sudenur Yaşa"],
  ["u-ahmet", "Ahmet Kırlı"],
  ["u-ozge", "Özge Neccar"],
  ["u-central", "Merkez Kişi"],
]);

export const members = [
  { team_id: OKSIJEN, user_id: "u-sude", is_active: true },
  { team_id: OKSIJEN, user_id: "u-ahmet", is_active: true },
  { team_id: OKSIJEN, user_id: "u-ozge", is_active: false },
  { team_id: "t-other", user_id: "u-central", is_active: true },
];

/** The team as it is now. */
export const optionsNow = () => buildTeamMemberOptions(OKSIJEN, members, teams, users);

export const namesOfOptions = (options: readonly { name: string }[]) => options.map((o) => o.name);
