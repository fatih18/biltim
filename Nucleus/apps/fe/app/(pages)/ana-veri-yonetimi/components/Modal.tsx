"use client";

import React from "react";

export function Modal(props: {
    open: boolean;
    title: string;
    description?: string;
    onClose: () => void;
    children: React.ReactNode;
    footer?: React.ReactNode;
}) {
    const { open, title, description, onClose, children, footer } = props;

    React.useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        if (open) window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl md:p-6">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
                        {description ? (
                            <p className="mt-1 text-[11px] text-slate-400">{description}</p>
                        ) : null}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-sm text-slate-400 hover:text-slate-200"
                    >
                        ✕
                    </button>
                </div>

                <div className="mt-4">{children}</div>

                {footer ? (
                    <div className="mt-5 flex justify-end gap-2 text-xs">{footer}</div>
                ) : null}
            </div>
        </div>
    );
}
