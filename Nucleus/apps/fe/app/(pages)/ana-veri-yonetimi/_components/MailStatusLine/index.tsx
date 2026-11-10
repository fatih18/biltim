"use client";

import { useEffect, useEffectEvent } from "react";
import { useGenericApiActions } from "@/app/_hooks/UseNucleusApi";
import { SecondaryButton } from "../../components/ui";
import { MAIL_STATUS_UNREADABLE, buildMailStatusText } from "../../_utils/mailStatusText";
import { readMailStatus } from "../../_utils/mailStatusView";
import { MailStatusSkeleton } from "./MailStatusSkeleton";
import { TONE_CLASSES } from "./toneClasses";

/*
 * One line under the header of Ana Veri Yonetimi: whether plan and audit mails
 * (R63, R70) can go out, through which provider and what is waiting, failed or
 * ran out (GET /biltim/mail/status). The server answers Merkez Ekip, Super
 * Admin and godmin only, so the page mounts this for exactly those.
 *
 * The answer is read from the action's own state and never copied elsewhere.
 * Until the first answer arrives (and before the request has started) the
 * skeleton stands in. An answer that cannot be read says so and offers another
 * try; it never falls back to "mail is off".
 */
export function MailStatusLine() {
  const actions = useGenericApiActions();
  const action = actions.BILTIM_MAIL_STATUS;

  const load = useEffectEvent(() => {
    action?.start({ payload: {} });
  });

  useEffect(() => {
    load();
  }, []);

  const state = action?.state;
  const view = readMailStatus(state?.data);
  const pending = state?.isPending === true;
  const failed = !pending && !view && (state?.error != null || state?.data != null);

  // An earlier answer stays on screen while a new one is on its way; only a first load shows the skeleton.
  if (view) {
    const text = buildMailStatusText(view);
    const tone = TONE_CLASSES[text.tone];
    return (
      <section
        aria-label="E-posta bildirimleri durumu"
        className={`rounded-lg border px-3 py-2 text-xs xs:py-2.5 xs:text-sm sm:px-4 lg:px-5 ${tone.box}`}
      >
        <p className="min-w-0 break-words font-medium">{text.headline}</p>
        {text.detail ? <p className={`mt-1 min-w-0 break-words text-xs ${tone.detail}`}>{text.detail}</p> : null}
      </section>
    );
  }

  if (failed) {
    const tone = TONE_CLASSES[MAIL_STATUS_UNREADABLE.tone];
    return (
      <section
        aria-label="E-posta bildirimleri durumu"
        className={`flex flex-col gap-2 rounded-lg border px-3 py-2 text-xs xs:py-2.5 xs:text-sm sm:flex-row sm:items-center sm:justify-between sm:px-4 lg:px-5 ${tone.box}`}
      >
        <div className="min-w-0">
          <p className="break-words font-medium">{MAIL_STATUS_UNREADABLE.headline}</p>
          <p className={`mt-1 break-words text-xs ${tone.detail}`}>{MAIL_STATUS_UNREADABLE.detail}</p>
        </div>
        <SecondaryButton type="button" onClick={() => action?.start({ payload: {} })} className="shrink-0 self-start sm:self-auto">
          Tekrar dene
        </SecondaryButton>
      </section>
    );
  }

  return <MailStatusSkeleton />;
}
