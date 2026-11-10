import { describe, expect, it } from "bun:test";
import { TONE_CLASSES } from "./toneClasses";

const COLOUR_UTILITY = /^(bg|text|border)-/;

describe("TONE_CLASSES", () => {
  it("gives every tone a box and a detail class set", () => {
    expect(Object.keys(TONE_CLASSES).sort()).toEqual(["attention", "off", "on"]);
    for (const tone of Object.values(TONE_CLASSES)) {
      expect(tone.box.length).toBeGreaterThan(0);
      expect(tone.detail.length).toBeGreaterThan(0);
    }
  });

  it("styles every colour utility in both themes: each light class has a dark: twin of the same kind", () => {
    for (const tone of Object.values(TONE_CLASSES)) {
      for (const set of [tone.box, tone.detail]) {
        const classes = set.split(/\s+/);
        const dark = classes.filter((name) => name.startsWith("dark:")).map((name) => name.slice(5).split("-")[0]);
        for (const name of classes.filter((c) => COLOUR_UTILITY.test(c))) {
          expect(dark).toContain(name.split("-")[0]);
        }
      }
    }
  });
});
