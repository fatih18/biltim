"use client";

import React from "react";
import { nowIso, uid } from "./utils";
import type { User } from "./types";

type AuditTeam = {
  id: string;
  name?: string | null;
  leaderUserId: string;
  isActive: boolean;
  createdAt: string;
};

type AuditTeamMember = {
  id: string;
  teamId: string;
  userId: string;
  isActive: boolean;
  createdAt: string;
};

const TEAM_KEYS = {
  GET: "GET_FIVE_S_AUDIT_TEAMS",
  ADD: "ADD_FIVE_S_AUDIT_TEAM",
  UPDATE: "UPDATE_FIVE_S_AUDIT_TEAM",
  DELETE: "DELETE_FIVE_S_AUDIT_TEAM",
} as const;

const TEAM_MEMBER_KEYS = {
  GET: "GET_FIVE_S_AUDIT_TEAM_MEMBERS",
  ADD: "ADD_FIVE_S_AUDIT_TEAM_MEMBER",
  DELETE: "DELETE_FIVE_S_AUDIT_TEAM_MEMBER",
} as const;

/** Guard: action var mı? */
function safeStart(A: any, key: string) {
  const entry = A?.[key];
  if (!entry?.start) {
    console.warn(`[TeamsTab] action not found: ${key}`);
    return null as null | ((args: any) => void);
  }
  return entry.start as (args: any) => void;
}

/** Roles normalize (Türkçe bozulma + casing + whitespace) */
function normalizeRoleName(input: unknown) {
  const s = String(input ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  return s
    .replaceAll("ã§", "ç")
    .replaceAll("ã¶", "ö")
    .replaceAll("ã¼", "ü")
    .replaceAll("ã±", "ı");
}

/**
 * Role eşleştirme:
 * - Denetçi
 * - Saha Sorumlusu (Field Manager)
 * - Denetim Lideri (bazı sistemlerde ayrı rol)
 *
 * Not: contains yerine set+includes hibrit yaptım (sende "Denetçi", "Denetim Lider", "Saha Sorumlusu" vs değişebiliyor).
 */
const ROLE_ALIASES = {
  AUDITOR: new Set([
    normalizeRoleName("denetçi"),
    normalizeRoleName("auditor"),
  ]),
  FIELD_MANAGER: new Set([
    normalizeRoleName("saha sorumlusu"),
    normalizeRoleName("field manager"),
  ]),
  TEAM_LEADER: new Set([
    normalizeRoleName("denetim lideri"),
    normalizeRoleName("audit leader"),
    normalizeRoleName("team leader"),
  ]),
};

function userHasAnyRoleLike(u: any, aliases: Set<string>) {
  const roles = Array.isArray(u?.roles) ? u.roles : [];
  const roleNames = roles.map((r: any) => normalizeRoleName(r?.name));
  for (const rn of roleNames) {
    for (const a of aliases) {
      // alias birebir veya içeriyorsa ok
      if (rn === a || rn.includes(a)) return true;
    }
  }
  return false;
}

function getUserDisplay(u: any) {
  return String(u?.name ?? u?.email ?? "Kullanıcı");
}

/** Team helpers */
function toTeam(row: any): AuditTeam {
  const id = row?.id ?? row?._id ?? row?.data?.id ?? uid();
  return {
    id: String(id),
    name: row?.name ?? null,
    leaderUserId: String(row?.leader_user_id ?? row?.leaderUserId ?? ""),
    isActive: Boolean(row?.is_active ?? row?.isActive ?? true),
    createdAt: String(row?.created_at ?? row?.createdAt ?? nowIso()),
  };
}

function toMember(row: any): AuditTeamMember {
  const id = row?.id ?? row?._id ?? row?.data?.id ?? uid();
  return {
    id: String(id),
    teamId: String(row?.team_id ?? row?.teamId ?? ""),
    userId: String(row?.user_id ?? row?.userId ?? ""),
    isActive: Boolean(row?.is_active ?? row?.isActive ?? true),
    createdAt: String(row?.created_at ?? row?.createdAt ?? nowIso()),
  };
}

export function TeamsTab({
  actionsRef,
  users,
  usersLoading,
  fetchUsers,
}: {
  actionsRef: React.RefObject<any>;
  users: User[]; // ✅ parent normalize ediyor: {id, name, roles?}
  usersLoading: boolean;
  fetchUsers: () => void;
}) {
  /** id -> name */
  const userNameById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const u of users as any[]) {
      const id = String(u?.id ?? "");
      if (!id) continue;
      m.set(id, getUserDisplay(u));
    }
    return m;
  }, [users]);

  /** roles datası var mı? */
  const hasAnyRolesOnUsers = React.useMemo(() => {
    return (users as any[]).some((u) => Array.isArray(u?.roles) && u.roles.length);
  }, [users]);

  /**
   * ✅ İSTENEN:
   * - Lider: SADECE "Saha Sorumlusu" (Field Manager) rolü (istersen ayrıca "Denetim Lideri" rolünü de dahil edebiliriz)
   * - Denetçiler: SADECE "Denetçi" rolü
   *
   * Roles yoksa (backend göndermiyorsa) => fallback: hepsi (ama bunu UI'da uyarıyoruz)
   */
  const leaderUsers = React.useMemo(() => {
    if (!hasAnyRolesOnUsers) return users as any[];

    // Lideri "Saha Sorumlusu"ndan seç
    const arr = (users as any[]).filter((u) => userHasAnyRoleLike(u, ROLE_ALIASES.FIELD_MANAGER));

    // Eğer sahada rol isimleri farklıysa (örn "Denetim Lideri") onu da opsiyonel destekle:
    const alt = (users as any[]).filter((u) => userHasAnyRoleLike(u, ROLE_ALIASES.TEAM_LEADER));

    const merged = [...arr, ...alt].filter(
      (u, i, a) => a.findIndex((x) => String(x?.id) === String(u?.id)) === i
    );

    // Hiç bulunamadıysa fallback (UI'da uyarı basacağız)
    return merged.length ? merged : (users as any[]);
  }, [users, hasAnyRolesOnUsers]);

  const auditorUsers = React.useMemo(() => {
    if (!hasAnyRolesOnUsers) return users as any[];
    const arr = (users as any[]).filter((u) => userHasAnyRoleLike(u, ROLE_ALIASES.AUDITOR));
    return arr.length ? arr : (users as any[]);
  }, [users, hasAnyRolesOnUsers]);

  /** teams + members */
  const [teams, setTeams] = React.useState<AuditTeam[]>([]);
  const [membersByTeam, setMembersByTeam] = React.useState<Record<string, AuditTeamMember[]>>({});
  const [teamsLoading, setTeamsLoading] = React.useState(false);

  const fetchTeamsAndMembers = React.useCallback(() => {
    const A = actionsRef.current as any;

    const startTeams = safeStart(A, TEAM_KEYS.GET);
    if (!startTeams) return;

    setTeamsLoading(true);

    startTeams({
      payload: { limit: 1000, orderBy: "created_at", orderDirection: "desc" },
      onAfterHandle: (res: any) => {
        const rows = res?.data ?? res ?? [];
        const t = Array.isArray(rows) ? rows.map(toTeam) : [];
        setTeams(t);

        const startMembers = safeStart(A, TEAM_MEMBER_KEYS.GET);
        if (!startMembers) {
          setMembersByTeam({});
          setTeamsLoading(false);
          return;
        }

        startMembers({
          payload: { limit: 5000, orderBy: "created_at", orderDirection: "desc" },
          onAfterHandle: (res2: any) => {
            const rows2 = res2?.data ?? res2 ?? [];
            const m = Array.isArray(rows2) ? rows2.map(toMember) : [];

            const grouped: Record<string, AuditTeamMember[]> = {};
            for (const mm of m) {
              if (!mm.teamId) continue;
              (grouped[mm.teamId] ??= []).push(mm);
            }
            setMembersByTeam(grouped);
            setTeamsLoading(false);
          },
          onErrorHandle: (err2: any) => {
            console.error(`${TEAM_MEMBER_KEYS.GET} error`, err2);
            setTeamsLoading(false);
          },
        });
      },
      onErrorHandle: (err: any) => {
        console.error(`${TEAM_KEYS.GET} error`, err);
        setTeamsLoading(false);
      },
    });
  }, [actionsRef]);

  /** init */
  React.useEffect(() => {
    fetchUsers();
    fetchTeamsAndMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** draft state */
  const [editingTeamId, setEditingTeamId] = React.useState<string | null>(null);
  const [draftName, setDraftName] = React.useState("");
  const [draftLeaderId, setDraftLeaderId] = React.useState("");
  const [draftMemberId, setDraftMemberId] = React.useState("");
  const [draftMembers, setDraftMembers] = React.useState<string[]>([]);

  const resetDraft = React.useCallback(() => {
    setEditingTeamId(null);
    setDraftName("");
    setDraftLeaderId("");
    setDraftMemberId("");
    setDraftMembers([]);
  }, []);

  const addDraftMember = React.useCallback(() => {
    const id = String(draftMemberId || "");
    if (!id) return;
    if (id === draftLeaderId) return alert("Lider denetçi listesine eklenemez.");
    setDraftMembers((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setDraftMemberId("");
  }, [draftMemberId, draftLeaderId]);

  const removeDraftMember = React.useCallback((id: string) => {
    setDraftMembers((prev) => prev.filter((x) => x !== id));
  }, []);

  const startEditTeam = React.useCallback(
    (t: AuditTeam) => {
      setEditingTeamId(t.id);
      setDraftName(String(t.name ?? ""));
      setDraftLeaderId(t.leaderUserId);
      setDraftMembers((membersByTeam[t.id] ?? []).map((m) => m.userId));
      setDraftMemberId("");
    },
    [membersByTeam]
  );

  /** ✅ UI filtre yetmez: FE doğrulama (backend de doğrulamalı) */
  const validateRoleConstraintsOnSave = React.useCallback(() => {
    if (!hasAnyRolesOnUsers) return true; // roles yoksa FE doğrulama yapamayız

    const leaderOk = leaderUsers.some((u: any) => String(u.id) === String(draftLeaderId));
    if (!leaderOk) {
      alert("Seçilen liderin rolü uygun değil. (Saha Sorumlusu / Denetim Lideri olmalı)");
      return false;
    }

    const auditorSet = new Set(auditorUsers.map((u: any) => String(u.id)));
    const bad = draftMembers.filter((id) => !auditorSet.has(String(id)));
    if (bad.length) {
      alert("Denetçi listesinde rolü uygun olmayan kullanıcı(lar) var. Sadece Denetçi seçilebilir.");
      return false;
    }

    return true;
  }, [hasAnyRolesOnUsers, leaderUsers, auditorUsers, draftLeaderId, draftMembers]);

  /** Create/Update Team + Members */
  const saveTeam = React.useCallback(() => {
    const A = actionsRef.current as any;

    if (!draftLeaderId) return alert("Lütfen bir lider seç.");
    if (draftMembers.length === 0) return alert("En az 1 denetçi eklemelisin.");
    if (draftMembers.includes(draftLeaderId)) return alert("Lider denetçi listesinde olamaz.");

    if (!validateRoleConstraintsOnSave()) return;

    const teamPayload = {
      name: draftName?.trim() || null,
      leader_user_id: draftLeaderId,
      is_active: true,
    };

    const addMembers = (teamId: string, userIds: string[]) => {
      const start = safeStart(A, TEAM_MEMBER_KEYS.ADD);
      if (!start) return;
      userIds.forEach((userId) => {
        start({
          payload: { team_id: teamId, user_id: userId, is_active: true },
          onErrorHandle: (err: any) => console.error(`${TEAM_MEMBER_KEYS.ADD} error`, err),
        });
      });
    };

    const deleteMembers = (memberIds: string[]) => {
      const start = safeStart(A, TEAM_MEMBER_KEYS.DELETE);
      if (!start) return;
      memberIds.forEach((_id) => {
        start({
          payload: { _id },
          onErrorHandle: (err: any) => console.error(`${TEAM_MEMBER_KEYS.DELETE} error`, err),
        });
      });
    };

    if (!editingTeamId) {
      const start = safeStart(A, TEAM_KEYS.ADD);
      if (!start) return;

      start({
        payload: teamPayload,
        onAfterHandle: (res: any) => {
          const createdRaw = res?.data?.[0] ?? res?.data ?? res;
          const created = toTeam(createdRaw);

          addMembers(created.id, draftMembers);

          resetDraft();
          fetchTeamsAndMembers();
        },
        onErrorHandle: (err: any) => {
          console.error(`${TEAM_KEYS.ADD} error`, err);
          alert("Ekip oluşturulurken hata oluştu.");
        },
      });
      return;
    }

    const start = safeStart(A, TEAM_KEYS.UPDATE);
    if (!start) return;

    start({
      payload: { _id: editingTeamId, ...teamPayload },
      onAfterHandle: () => {
        const existingMembers = membersByTeam[editingTeamId] ?? [];
        const existingUserIds = new Set(existingMembers.map((m) => String(m.userId)));
        const nextUserIds = new Set(draftMembers.map(String));

        const toAdd = draftMembers.filter((id) => !existingUserIds.has(String(id)));
        const toRemoveMemberRowIds = existingMembers
          .filter((m) => !nextUserIds.has(String(m.userId)))
          .map((m) => m.id);

        if (toAdd.length) addMembers(editingTeamId, toAdd);
        if (toRemoveMemberRowIds.length) deleteMembers(toRemoveMemberRowIds);

        resetDraft();
        fetchTeamsAndMembers();
      },
      onErrorHandle: (err: any) => {
        console.error(`${TEAM_KEYS.UPDATE} error`, err);
        alert("Ekip güncellenirken hata oluştu.");
      },
    });
  }, [
    actionsRef,
    draftLeaderId,
    draftMembers,
    draftName,
    editingTeamId,
    fetchTeamsAndMembers,
    membersByTeam,
    resetDraft,
    validateRoleConstraintsOnSave,
  ]);

  const deleteTeam = React.useCallback(
    (teamId: string) => {
      const A = actionsRef.current as any;
      const start = safeStart(A, TEAM_KEYS.DELETE);
      if (!start) return;

      start({
        payload: { _id: teamId },
        onAfterHandle: () => {
          if (editingTeamId === teamId) resetDraft();
          fetchTeamsAndMembers();
        },
        onErrorHandle: (err: any) => {
          console.error(`${TEAM_KEYS.DELETE} error`, err);
          alert("Ekip silinirken hata oluştu.");
        },
      });
    },
    [actionsRef, editingTeamId, fetchTeamsAndMembers, resetDraft]
  );

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {/* Builder */}
      <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">
              {editingTeamId ? "Takımı Düzenle" : "Yeni Takım Oluştur"}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              1 lider + denetçiler seçip kaydet.
            </div>

            {!hasAnyRolesOnUsers ? (
              <div className="mt-2 text-[11px] text-amber-300/90">
                Uyarı: Kullanıcı rolleri gelmiyor. Filtreleme yapılamadı (herkes listeleniyor).
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              className="rounded-md border border-slate-700 bg-slate-950/60 px-3 py-1 text-xs hover:bg-slate-950"
              onClick={() => {
                fetchUsers();
                fetchTeamsAndMembers();
              }}
            >
              Yenile
            </button>

            {editingTeamId ? (
              <button
                className="rounded-md border border-slate-700 bg-slate-950/60 px-3 py-1 text-xs hover:bg-slate-950"
                onClick={resetDraft}
              >
                İptal
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {/* Team name */}
          <div>
            <div className="text-xs text-slate-400 mb-1">Ekip Adı (opsiyonel)</div>
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-950/60 text-slate-50 px-3 py-2 text-sm"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Örn: Üretim Ekibi - A"
            />
          </div>

          {/* Leader */}
          <div>
            <div className="text-xs text-slate-400 mb-1">Denetim Lideri (Saha Sorumlusu)</div>
            <select
              className="w-full rounded-md border border-slate-700 bg-slate-950/60 text-slate-50 px-3 py-2 text-sm"
              value={draftLeaderId}
              onChange={(e) => setDraftLeaderId(e.target.value)}
            >
              <option value="">{usersLoading ? "Yükleniyor..." : "Lider seç"}</option>
              {leaderUsers.map((u: any) => (
                <option key={String(u.id)} value={String(u.id)}>
                  {getUserDisplay(u)}
                </option>
              ))}
            </select>

            <div className="mt-1 text-[11px] text-slate-500">
              Lider adayları: {leaderUsers.length} • Denetçi adayları: {auditorUsers.length}
            </div>
          </div>

          {/* Auditor add */}
          <div>
            <div className="text-xs text-slate-400 mb-1">Denetçi Ekle</div>
            <div className="flex gap-2">
              <select
                className="flex-1 rounded-md border border-slate-700 bg-slate-950/60 text-slate-50 px-3 py-2 text-sm"
                value={draftMemberId}
                onChange={(e) => setDraftMemberId(e.target.value)}
              >
                <option value="">{usersLoading ? "Yükleniyor..." : "Denetçi seç"}</option>
                {auditorUsers
                  .filter((u: any) => String(u.id) !== String(draftLeaderId))
                  .map((u: any) => (
                    <option key={String(u.id)} value={String(u.id)}>
                      {getUserDisplay(u)}
                    </option>
                  ))}
              </select>

              <button
                className="rounded-md bg-slate-50 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-slate-200 disabled:opacity-50"
                onClick={addDraftMember}
                disabled={!draftMemberId}
              >
                Ekle
              </button>
            </div>
          </div>

          {/* Members list */}
          <div>
            <div className="text-xs text-slate-400 mb-2">Takım Denetçileri</div>
            {draftMembers.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-700 bg-slate-950/30 p-3 text-sm text-slate-500">
                Henüz denetçi eklenmedi.
              </div>
            ) : (
              <div className="space-y-2">
                {draftMembers.map((id) => (
                  <div
                    key={id}
                    className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2"
                  >
                    <div className="text-sm">{userNameById.get(id) ?? id}</div>
                    <button
                      className="text-xs text-rose-300 hover:text-rose-200"
                      onClick={() => removeDraftMember(id)}
                    >
                      Çıkar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Save */}
          <div className="flex items-center gap-2 pt-2">
            <button
              className="rounded-md bg-emerald-400/90 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
              onClick={saveTeam}
              disabled={!draftLeaderId || draftMembers.length === 0}
            >
              {editingTeamId ? "Kaydet" : "Takımı Oluştur"}
            </button>

            <div className="text-[11px] text-slate-500">
              {teamsLoading ? "Yükleniyor..." : `Tanımlı ekip: ${teams.length}`}
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="lg:col-span-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Tanımlı Ekipler</div>
            <div className="mt-1 text-xs text-slate-400">Ekipleri burada yönetebilirsin.</div>
          </div>

          <div className="text-xs text-slate-500">
            Teams: {String(teamsLoading)} • Users: {String(usersLoading)}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {teams.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-700 bg-slate-950/30 p-4 text-sm text-slate-500">
              Henüz ekip yok.
            </div>
          ) : (
            teams.map((t) => {
              const leaderName = userNameById.get(t.leaderUserId) ?? t.leaderUserId;

              const members = (membersByTeam[t.id] ?? [])
                .filter((m) => m.isActive)
                .map((m) => userNameById.get(m.userId) ?? m.userId);

              return (
                <div key={t.id} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold">
                        {t.name ? (
                          <>
                            {t.name} <span className="text-slate-500 font-normal">•</span>{" "}
                          </>
                        ) : null}
                        Lider: <span className="font-normal text-slate-200">{leaderName}</span>
                      </div>

                      <div className="text-xs text-slate-400">
                        Denetçiler ({members.length}):{" "}
                        <span className="text-slate-300">
                          {members.length ? members.join(", ") : "—"}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600">
                        {t.isActive ? "Aktif" : "Pasif"} • Oluşturma: {t.createdAt}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-md border border-slate-700 bg-slate-950/60 px-3 py-1 text-xs hover:bg-slate-950"
                        onClick={() => startEditTeam(t)}
                      >
                        Düzenle
                      </button>
                      <button
                        className="rounded-md border border-rose-900/40 bg-rose-950/30 px-3 py-1 text-xs text-rose-200 hover:bg-rose-950/50"
                        onClick={() => deleteTeam(t.id)}
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}