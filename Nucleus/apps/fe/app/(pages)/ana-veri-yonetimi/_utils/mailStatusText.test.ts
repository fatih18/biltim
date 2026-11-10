import { describe, expect, it } from "bun:test";
import { MAIL_STATUS_UNREADABLE, buildMailStatusText } from "./mailStatusText";
import type { MailStatusView } from "./mailStatusView";

const VIEW: MailStatusView = {
  available: true,
  providerConfigured: true,
  mailerInstalled: true,
  provider: "smtp",
  senderAddress: "denetim@firma.example",
  windowHours: 48,
  maxAttempts: 5,
  expiredDays: 30,
  pending: 3,
  failed: 0,
  expired: 0,
};

const off = (over: Partial<MailStatusView> = {}): MailStatusView => ({
  ...VIEW,
  available: false,
  providerConfigured: false,
  provider: null,
  senderAddress: "",
  pending: 0,
  ...over,
});

describe("when no provider is configured", () => {
  it("says mail is off, what that means and what to do, in the words the customer notes call for", () => {
    const text = buildMailStatusText(off());
    expect(text.tone).toBe("off");
    expect(text.headline).toBe(
      "E-posta bildirimleri kapalı: SMTP tanımlı değil. Tanımlanana kadar plan ve denetim postaları gönderilmez."
    );
    expect(text.detail).toContain("sunucu ortam değişkenlerine SMTP_* değerlerini girin");
    expect(text.detail).toContain("SMTP_HOST, SMTP_USER ve SMTP_PASSWORD");
    expect(text.detail).toContain("sistem yöneticisi");
  });

  it("does not mention counts when there is nothing waiting and nothing expired", () => {
    const text = buildMailStatusText(off());
    expect(text.detail).not.toContain("bekliyor");
    expect(text.detail).not.toContain("süresi dolduğu");
  });

  it("says how many plans still wait and until when they can be mailed", () => {
    const text = buildMailStatusText(off({ pending: 4 }));
    expect(text.detail).toContain("Şu an 4 planın postası bekliyor; 48 saat dolmadan e-posta açılırsa gönderilir, dolarsa süresi geçer.");
  });

  it("says how many plans were missed for good, within the look-back", () => {
    const text = buildMailStatusText(off({ expired: 7 }));
    expect(text.detail).toContain("Son 30 günde 7 planın postası süresi dolduğu için hiç gönderilmedi");
  });

  it("keeps the instruction first, then the waiting plans, then the missed ones", () => {
    const detail = buildMailStatusText(off({ pending: 2, expired: 1 })).detail ?? "";
    expect(detail.indexOf("Ne yapmalı")).toBe(0);
    expect(detail.indexOf("bekliyor")).toBeGreaterThan(detail.indexOf("Ne yapmalı"));
    expect(detail.indexOf("süresi dolduğu")).toBeGreaterThan(detail.indexOf("bekliyor"));
  });
});

describe("when the SMTP values are in but the nodemailer package is not installed", () => {
  const missing = (over: Partial<MailStatusView> = {}) => off({ providerConfigured: true, mailerInstalled: false, ...over });
  const SENTENCE = "SMTP bilgileri girildi ama nodemailer paketi sunucuda kurulu değil.";
  const HOW =
    "Sunucunun npm erişimi açıkken be-nucleus klasöründe bun add nodemailer çalıştırıp servisi yeniden başlatın.";

  it("says what is wrong, that no mail goes out, and what to do, in amber", () => {
    const text = buildMailStatusText(missing());
    expect(text.tone).toBe("off");
    expect(text.headline).toBe(`${SENTENCE} Paket kurulana kadar plan ve denetim postaları gönderilmez.`);
    expect(text.detail).toContain(HOW);
    expect(text.detail).toContain("sistem yöneticisi");
  });

  it("does not say the SMTP values are missing: they are in", () => {
    const text = buildMailStatusText(missing());
    expect(text.headline).not.toContain("SMTP tanımlı değil");
    expect(text.detail).not.toContain("SMTP_* değerlerini girin");
  });

  it("starts with the way out, then the waiting plans, then the missed ones", () => {
    const detail = buildMailStatusText(missing({ pending: 2, expired: 1 })).detail ?? "";
    expect(detail.indexOf(HOW)).toBe(0);
    expect(detail.indexOf("Şu an 2 planın postası bekliyor")).toBeGreaterThan(detail.indexOf(HOW));
    expect(detail.indexOf("Son 30 günde 1 planın postası")).toBeGreaterThan(detail.indexOf("bekliyor"));
  });

  it("keeps the counts out when nothing waits and nothing expired", () => {
    const detail = buildMailStatusText(missing()).detail ?? "";
    expect(detail).not.toContain("bekliyor");
    expect(detail).not.toContain("süresi dolduğu");
  });

  it("is the plain off line while the package is installed, and while no SMTP value is filled in", () => {
    for (const view of [off({ providerConfigured: true, mailerInstalled: true }), off({ providerConfigured: false, mailerInstalled: false })]) {
      expect(buildMailStatusText(view).headline).toContain("SMTP tanımlı değil");
    }
  });

  it("never replaces the line of a provider that is running", () => {
    const text = buildMailStatusText({ ...VIEW, mailerInstalled: false });
    expect(text.headline).toContain("E-posta bildirimleri açık");
  });
});

describe("when a provider is configured", () => {
  it("names the provider, the sender and the three counts on one line", () => {
    const text = buildMailStatusText(VIEW);
    expect(text.tone).toBe("on");
    expect(text.headline).toBe(
      "E-posta bildirimleri açık: SMTP, gönderen denetim@firma.example. Bekleyen: 3, hatalı: 0, süresi geçen: 0."
    );
    expect(text.detail).toBeNull();
  });

  it("writes the counts it was given, zero included", () => {
    expect(buildMailStatusText({ ...VIEW, pending: 0, failed: 2, expired: 9 }).headline).toContain(
      "Bekleyen: 0, hatalı: 2, süresi geçen: 9."
    );
  });

  it("calls the other providers by their names", () => {
    expect(buildMailStatusText({ ...VIEW, provider: "azure" }).headline).toContain("açık: Azure,");
    expect(buildMailStatusText({ ...VIEW, provider: "gmail" }).headline).toContain("açık: Gmail,");
  });

  it("says so when the provider does not tell its sender or its name", () => {
    const text = buildMailStatusText({ ...VIEW, provider: null, senderAddress: "" });
    expect(text.headline).toContain("sağlayıcı bilinmiyor, gönderen adres bilinmiyor.");
  });

  it("asks for attention and says what to check when mails used their attempts up", () => {
    const text = buildMailStatusText({ ...VIEW, failed: 2 });
    expect(text.tone).toBe("attention");
    expect(text.detail).toContain("Hatalı: 2 planın postası 5 denemede de gönderilemedi");
    expect(text.detail).toContain("sağlayıcı ayarlarını ve alıcı adreslerini kontrol edin");
  });

  it("asks for attention and says the mails will not be sent when their window ran out", () => {
    const text = buildMailStatusText({ ...VIEW, expired: 3 });
    expect(text.tone).toBe("attention");
    expect(text.detail).toContain("Süresi geçen: 3 planın postası 48 saat içinde gönderilemediği için artık gönderilmeyecek (son 30 gün).");
  });

  it("uses the window and the look-back the server reports, not fixed numbers", () => {
    const text = buildMailStatusText({ ...VIEW, expired: 1, windowHours: 24, expiredDays: 14, failed: 1, maxAttempts: 3 });
    expect(text.detail).toContain("3 denemede");
    expect(text.detail).toContain("24 saat içinde");
    expect(text.detail).toContain("son 14 gün");
  });
});

describe("an unreadable answer", () => {
  it("says what could not be read, what it means and what to do, without claiming mail is on or off", () => {
    expect(MAIL_STATUS_UNREADABLE.headline).toBe("E-posta durumu okunamadı.");
    expect(MAIL_STATUS_UNREADABLE.detail).toContain("açık mı kapalı mı olduğu bu ekranda görünmüyor");
    expect(MAIL_STATUS_UNREADABLE.detail).toContain("Tekrar deneyin");
    expect(MAIL_STATUS_UNREADABLE.tone).toBe("attention");
  });
});
