"use client";

import { useEffect, useRef, useState } from "react";
import { useGenericApiActions } from "@/app/_hooks/UseNucleusApi";

/**
 * Where the signed-in person stands: their teams and the locations they
 * answer for, as the server works it out (`GET /biltim/me/scope`).
 *
 * Screens used to work this out themselves from whatever rows they had
 * loaded, after the server had already counted the rows they were about to
 * hide — so a field manager's tab said 12 and showed 3 (#23). With this a
 * screen can ask the server for exactly that person's rows.
 *
 * `scope` is null until it has loaded, and stays null if it cannot be read;
 * a screen that needs it to narrow a query should wait rather than show
 * everything in the meantime.
 */
export type MyScope = {
  userId: string;
  isGod: boolean;
  roles: string[];
  teamIds: string[];
  locationIds: string[];
  locationNames: string[];
  fieldManagerLocationIds: string[];
  fieldManagerLocationNames: string[];
};

export function useMyScope(): { scope: MyScope | null; failed: boolean } {
  const actions = useGenericApiActions();
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  const [scope, setScope] = useState<MyScope | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const start = (actionsRef.current as any)?.BILTIM_MY_SCOPE?.start;
    if (!start) {
      setFailed(true);
      return;
    }
    start({
      payload: {},
      onAfterHandle: (res: any) => {
        const data = (res?.data ?? res) as Partial<MyScope> | undefined;
        const list = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);
        setScope({
          userId: String(data?.userId ?? ""),
          isGod: data?.isGod === true,
          roles: list(data?.roles),
          teamIds: list(data?.teamIds),
          locationIds: list(data?.locationIds),
          locationNames: list(data?.locationNames),
          fieldManagerLocationIds: list(data?.fieldManagerLocationIds),
          fieldManagerLocationNames: list(data?.fieldManagerLocationNames),
        });
      },
      onErrorHandle: (e: unknown) => {
        console.error("BILTIM_MY_SCOPE error", e);
        setFailed(true);
      },
    });
  }, []);

  return { scope, failed };
}
