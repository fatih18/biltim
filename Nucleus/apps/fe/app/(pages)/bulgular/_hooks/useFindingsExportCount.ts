"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useGenericApiActions } from "@/app/_hooks/UseNucleusApi";
import { queryString } from "@/app/_utils/downloadFile";
import { type CountAnswer, countToShow, readCount } from "../_utils/exportCount";

/**
 * How many findings the Excel will hold for these parameters (R48), or null
 * while the server is counting or when it could not say. The parameters are the
 * ones the download sends, so the number is the file's own row count.
 *
 * Every change of parameters asks again; an answer for earlier parameters that
 * arrives late is dropped. A failed count is not an error on the screen: the
 * sentence beside the button simply goes without a number.
 */
export function useFindingsExportCount(params: Record<string, string>, enabled: boolean): number | null {
  const actions = useGenericApiActions();
  const [answer, setAnswer] = useState<CountAnswer | null>(null);
  const latest = useRef(0);
  const key = queryString(params);

  const ask = useEffectEvent((requestKey: string) => {
    const request = ++latest.current;
    const keep = (total: number | null) => {
      if (latest.current === request) setAnswer({ key: requestKey, total });
    };
    actions.GET_REPORTS_FINDINGS_COUNT?.start({
      payload: params,
      onAfterHandle: (body) => keep(readCount(body)),
      onErrorHandle: () => keep(null),
    });
  });

  useEffect(() => {
    if (!enabled) return;
    ask(key);
    // New parameters, or leaving: what is still on its way is stale.
    return () => {
      latest.current += 1;
    };
  }, [key, enabled]);

  return countToShow(answer, key, enabled);
}
