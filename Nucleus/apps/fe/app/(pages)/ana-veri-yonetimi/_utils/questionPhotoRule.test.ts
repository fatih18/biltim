import { describe, expect, it } from "bun:test";
import { REQUIRE_PHOTO_DETAILS, REQUIRE_PHOTO_HELP, REQUIRE_PHOTO_TOOLTIP, photoRuleLabel } from "./questionPhotoRule";

describe("photoRuleLabel", () => {
  it("names the state beside the explanation label", () => {
    expect(photoRuleLabel(true)).toBe("Fotoğraf zorunlu");
    expect(photoRuleLabel(false)).toBe("Fotoğraf opsiyonel");
  });
});

describe("REQUIRE_PHOTO_HELP and the tooltip behind it", () => {
  it("shows one sentence under the toggle: a new finding on Orta/Kötü needs a photo to be saved and sent", () => {
    expect(REQUIRE_PHOTO_HELP).toContain("Orta ya da Kötü");
    expect(REQUIRE_PHOTO_HELP).toContain("yeni bir bulgu");
    expect(REQUIRE_PHOTO_HELP).toContain("kaydedilemez ve gönderilemez");
    expect(REQUIRE_PHOTO_HELP.match(/[.]/g)).toHaveLength(1);
    expect(REQUIRE_PHOTO_HELP.endsWith(".")).toBe(true);
  });

  it("keeps the edge cases out of the visible line and in the details", () => {
    expect(REQUIRE_PHOTO_HELP).not.toContain("zaten açık");
    expect(REQUIRE_PHOTO_DETAILS).toContain("zaten açık bir bulgu varsa fotoğraf istenmez");
    expect(REQUIRE_PHOTO_DETAILS).toContain("tekil bulguda ise fotoğraf zorunludur");
    expect(REQUIRE_PHOTO_DETAILS).toContain("Kapalıyken fotoğraf isteğe bağlıdır");
  });

  it("the tooltip says everything the old three sentences said, nothing less", () => {
    expect(REQUIRE_PHOTO_TOOLTIP).toBe(`${REQUIRE_PHOTO_HELP} ${REQUIRE_PHOTO_DETAILS}`);
    expect(REQUIRE_PHOTO_TOOLTIP.match(/[.]/g)).toHaveLength(3);
  });
});

describe("the toggle puts the details in a title, not under the switch", () => {
  it("renders the one sentence and the tooltip on the switch", async () => {
    const source = await Bun.file(new URL("../_components/RequirePhotoToggle/index.tsx", import.meta.url)).text();
    expect(source).toContain("title={REQUIRE_PHOTO_TOOLTIP}");
    expect(source).toContain("{REQUIRE_PHOTO_HELP}</p>");
    expect(source).not.toContain("REQUIRE_PHOTO_DETAILS");
  });
});
