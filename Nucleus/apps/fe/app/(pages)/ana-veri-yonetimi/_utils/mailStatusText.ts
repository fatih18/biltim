import type { MailProvider, MailStatusView } from "./mailStatusView";

/*
 * The sentences of the mail status line on the master data screen (R63, R70).
 *
 * Each says what is the case, what it means for the plan mails and, where
 * someone has to act, what to do and who does it. Merkez Ekip reads them but
 * cannot edit the server's environment, so the way out names the system
 * administrator for that step.
 */

/** `on`: mail goes out. `off`: no mail goes out (no provider, or its package is missing). `attention`: mail goes out but some mails did not or will not. */
export type MailStatusTone = "on" | "off" | "attention";

export type MailStatusText = {
  tone: MailStatusTone;
  headline: string;
  detail: string | null;
};

const PROVIDER_LABEL: Record<MailProvider, string> = {
  azure: "Azure",
  gmail: "Gmail",
};

/** The answer could not be read at all: the line says so instead of guessing "off" or "on". */
export const MAIL_STATUS_UNREADABLE: MailStatusText = {
  tone: "attention",
  headline: "E-posta durumu okunamadı.",
  detail:
    "Bildirimlerin açık mı kapalı mı olduğu bu ekranda görünmüyor; plan ve denetim postalarının gönderimi bundan etkilenmez. Tekrar deneyin, sürerse sistem yöneticisine bildirin.",
};

/** What waits and what was missed while mail is off: the same two sentences whatever the reason it is off. */
function offBacklogParts(view: MailStatusView): string[] {
  const parts: string[] = [];
  if (view.pending > 0) {
    parts.push(
      `Şu an ${view.pending} planın postası bekliyor; ${view.windowHours} saat dolmadan e-posta açılırsa gönderilir, dolarsa süresi geçer.`
    );
  }
  if (view.expired > 0) {
    parts.push(
      `Son ${view.expiredDays} günde ${view.expired} planın postası süresi dolduğu için hiç gönderilmedi ve artık gönderilmeyecek.`
    );
  }
  return parts;
}

function offText(view: MailStatusView): MailStatusText {
  const parts = [
    "Sunucu ortam değişkenlerine AZURE_EMAIL_CONNECTION_STRING ve AZURE_EMAIL_SENDER_ADDRESS değerlerini girip servisi yeniden başlatın. Bu adımı sistem yöneticisi yapar.",
    ...offBacklogParts(view),
  ];
  return {
    tone: "off",
    headline:
      "E-posta bildirimleri kapalı: Azure Communication Services bağlantı bilgisi girilmedi. Girilene kadar plan ve denetim postaları gönderilmez.",
    detail: parts.join(" "),
  };
}

/**
 * The Azure values are in but the @azure/communication-email package cannot be loaded on the server (it is an
 * optional dependency of nucleus-core-ts that normally comes with bun install). Nothing is sent until it is
 * there, so the line says what is wrong, what it means and who does what.
 */
function packageMissingText(view: MailStatusView): MailStatusText {
  const parts = [
    "Sunucuda Nucleus klasöründe bun install --frozen-lockfile çalıştırıp servisi yeniden başlatın (npm erişimi gerekir). Bu adımı sistem yöneticisi yapar.",
    ...offBacklogParts(view),
  ];
  return {
    tone: "off",
    headline:
      "Azure e-posta bilgileri girildi ama '@azure/communication-email' paketi sunucuda kurulu değil. Paket kurulana kadar plan ve denetim postaları gönderilmez.",
    detail: parts.join(" "),
  };
}

function onText(view: MailStatusView): MailStatusText {
  const provider = view.provider ? PROVIDER_LABEL[view.provider] : "sağlayıcı bilinmiyor";
  const sender = view.senderAddress || "adres bilinmiyor";
  const parts: string[] = [];
  if (view.failed > 0) {
    parts.push(
      `Hatalı: ${view.failed} planın postası ${view.maxAttempts} denemede de gönderilemedi ve tekrar denenmeyecek; sağlayıcı ayarlarını ve alıcı adreslerini kontrol edin.`
    );
  }
  if (view.expired > 0) {
    parts.push(
      `Süresi geçen: ${view.expired} planın postası ${view.windowHours} saat içinde gönderilemediği için artık gönderilmeyecek (son ${view.expiredDays} gün).`
    );
  }
  return {
    tone: parts.length > 0 ? "attention" : "on",
    headline: `E-posta bildirimleri açık: ${provider}, gönderen ${sender}. Bekleyen: ${view.pending}, hatalı: ${view.failed}, süresi geçen: ${view.expired}.`,
    detail: parts.length > 0 ? parts.join(" ") : null,
  };
}

export function buildMailStatusText(view: MailStatusView): MailStatusText {
  if (view.available) return onText(view);
  return view.providerConfigured && !view.packageInstalled ? packageMissingText(view) : offText(view);
}
