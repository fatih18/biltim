import { describe, expect, it } from "bun:test";
import { withoutRoleAsTeam } from "./userTeams";

/*
 * The screens' "Ekip: <role>" stripping (userTeams.ts) and the server's (the
 * Excel register and the dashboard workbook, be-nucleus src/routes/teamLine.ts)
 * must strip the same roles: the server's comment says to keep them level, and
 * they had drifted (the screens knew only the database names). Source-text
 * check of both lists, so a role added to one and not the other fails here.
 */
const readSource = async (relative: string) => (await Bun.file(new URL(relative, import.meta.url)).text()).replace(/\r\n/g, "\n");

/** The quoted names inside `const ROLE_NAMES ... = [ ... ]`. */
function roleNamesIn(source: string): string[] {
  const start = source.indexOf("const ROLE_NAMES");
  if (start < 0) throw new Error("no ROLE_NAMES list in the source");
  const open = source.indexOf("[", source.indexOf("=", start));
  const close = source.indexOf("]", open);
  if (open < 0 || close < 0) throw new Error("the ROLE_NAMES list is not closed");
  const names = [...source.slice(open, close).matchAll(/"([^"]+)"|'([^']+)'/g)].map((m) => m[1] ?? m[2] ?? "");
  if (names.length < 8) throw new Error(`only ${names.length} role names were found; the span is wrong`);
  return names;
}

describe("the screens and the server strip the same role names", () => {
  it("both lists hold the same names", async () => {
    const screens = roleNamesIn(await readSource("./userTeams.ts"));
    const server = roleNamesIn(await readSource("../../../../../be-nucleus/src/routes/teamLine.ts"));
    expect([...screens].sort()).toEqual([...server].sort());
  });

  it("the screens drop an Ekip line for every name on the server's list, in either case", async () => {
    const server = roleNamesIn(await readSource("../../../../../be-nucleus/src/routes/teamLine.ts"));
    for (const name of server) {
      for (const written of [name, name.toLocaleUpperCase("tr"), name.toLocaleLowerCase("tr")]) {
        expect(withoutRoleAsTeam(`A\nEkip: ${written}\nB`)).toBe("A\nB");
      }
    }
  });
});
