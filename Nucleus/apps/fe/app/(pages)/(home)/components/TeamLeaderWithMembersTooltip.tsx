import React from "react";
import { createPortal } from "react-dom";
import { TeamInfo } from "../page";

function useClickOutside(
    refs: React.RefObject<HTMLElement>[],
    onOutside: () => void
) {
    React.useEffect(() => {
        function handler(e: MouseEvent) {
            const t = e.target as Node;
            const inside = refs.some((r) => r.current && r.current.contains(t));
            if (!inside) onOutside();
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [refs, onOutside]);
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

export function TeamLeaderWithMembersTooltip({
    teamId,
    teamInfoById,
}: {
    teamId: string;
    teamInfoById: Map<string, TeamInfo>;
}) {
    const info = teamInfoById.get(teamId);
    const leader = info?.leaderName ?? "—";
    const members = info?.memberNames ?? [];

    const [open, setOpen] = React.useState(false);
    const anchorRef = React.useRef<HTMLButtonElement>(null);
    const popRef = React.useRef<HTMLDivElement>(null);

    const [pos, setPos] = React.useState<{ top: number; left: number }>({
        top: 0,
        left: 0,
    });

    const recalc = React.useCallback(() => {
        const a = anchorRef.current;
        const p = popRef.current;
        if (!a || !p) return;

        const r = a.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        const width = 288; // w-72
        const height = p.offsetHeight || 180;

        // default: anchor'ın altına, sol hizalı
        let left = r.left;
        let top = r.bottom + 8;

        // sağdan taşarsa sola kaydır
        left = clamp(left, 8, vw - width - 8);

        // aşağıdan taşarsa yukarı aç
        if (top + height > vh - 8) {
            top = r.top - height - 8;
            // yine de taşarsa orta-yakın ayarla
            top = clamp(top, 8, vh - height - 8);
        }

        setPos({ top, left });
    }, []);

    React.useEffect(() => {
        if (!open) return;
        recalc();

        function onResize() {
            recalc();
        }
        function onScroll() {
            recalc();
        }

        window.addEventListener("resize", onResize);
        window.addEventListener("scroll", onScroll, true); // nested scroll’lar için
        return () => {
            window.removeEventListener("resize", onResize);
            window.removeEventListener("scroll", onScroll, true);
        };
    }, [open, recalc]);

    useClickOutside([anchorRef as any, popRef as any], () => setOpen(false));

    return (
        <>
            <button
                ref={anchorRef}
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 px-2 py-1 text-xs text-slate-200 hover:bg-slate-950/60"
            >
                <span className="max-w-[160px] truncate">{leader}</span>
                <span className="text-[10px] text-slate-500">Üyeler</span>
            </button>

            {open
                ? createPortal(
                    <div
                        ref={popRef}
                        className="fixed z-[9999] w-72 rounded-lg border border-slate-700 bg-slate-950/95 p-3 text-xs shadow-xl"
                        style={{ top: pos.top, left: pos.left }}
                    >
                        <div className="text-[11px] font-semibold text-slate-200">
                            Ekip üyeleri
                        </div>

                        {members.length ? (
                            <ul className="mt-2 max-h-40 space-y-1 overflow-auto pr-1 text-slate-300">
                                {members.map((n, i) => (
                                    <li key={`${n}-${i}`} className="truncate">
                                        • {n}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="mt-2 text-slate-500">Üye bulunamadı.</div>
                        )}

                        <div className="mt-2 text-[10px] text-slate-600">
                            Kapatmak için dışarı tıkla ya da tekrar tıkla.
                        </div>
                    </div>,
                    document.body
                )
                : null}
        </>
    );
}
