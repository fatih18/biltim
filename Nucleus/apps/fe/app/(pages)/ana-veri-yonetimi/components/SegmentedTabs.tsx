"use client";

import React from "react";

export function SegmentedTabs<T extends string>(props: {
    value: T;
    onChange: (v: T) => void;
    items: Array<{ value: T; label: string }>;
}) {
    const { value, onChange, items } = props;

    return (
        <div className="flex gap-2">
            {items.map((it) => {
                const active = it.value === value;
                return (
                    <button
                        key={it.value}
                        type="button"
                        onClick={() => onChange(it.value)}
                        className={[
                            "rounded-md px-4 py-2 text-xs font-semibold border",
                            active
                                ? "bg-sky-500 text-slate-950 border-sky-400"
                                : "bg-slate-900/60 text-slate-200 border-slate-800 hover:bg-slate-800/60",
                        ].join(" ")}
                    >
                        {it.label}
                    </button>
                );
            })}
        </div>
    );
}
