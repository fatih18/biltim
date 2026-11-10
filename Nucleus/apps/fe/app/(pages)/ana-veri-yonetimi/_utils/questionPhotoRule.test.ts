import { describe, expect, it } from "bun:test";
import { REQUIRE_PHOTO_HELP, photoRuleLabel, readRequirePhoto } from "./questionPhotoRule";

describe("readRequirePhoto — the toggle mapping (R72)", () => {
  it("is on only for an explicit true", () => {
    expect(readRequirePhoto({ require_photo: true })).toBe(true);
    expect(readRequirePhoto({ require_photo: "true" })).toBe(true);
  });

  it("is off for every question that has no value yet: the existing ones", () => {
    expect(readRequirePhoto({})).toBe(false);
    expect(readRequirePhoto({ require_photo: undefined })).toBe(false);
    expect(readRequirePhoto({ require_photo: null })).toBe(false);
  });

  it("is off for false and for anything that merely looks truthy", () => {
    expect(readRequirePhoto({ require_photo: false })).toBe(false);
    expect(readRequirePhoto({ require_photo: "false" })).toBe(false);
    expect(readRequirePhoto({ require_photo: 1 })).toBe(false);
    expect(readRequirePhoto({ require_photo: "yes" })).toBe(false);
  });

  it("does not read the explanation switch's column", () => {
    expect(readRequirePhoto({ require_explanation: true })).toBe(false);
  });
});

describe("photoRuleLabel", () => {
  it("names the state beside the explanation label", () => {
    expect(photoRuleLabel(true)).toBe("Fotoğraf zorunlu");
    expect(photoRuleLabel(false)).toBe("Fotoğraf opsiyonel");
  });
});

describe("REQUIRE_PHOTO_HELP", () => {
  it("states the real rule: a new finding on Orta/Kötü, not an already open one", () => {
    expect(REQUIRE_PHOTO_HELP).toContain("Orta ya da Kötü");
    expect(REQUIRE_PHOTO_HELP).toContain("yeni bir bulgu");
    expect(REQUIRE_PHOTO_HELP).toContain("zaten açık bir bulgu varsa fotoğraf istenmez");
  });
});
