"use client";

import React from "react";
import { useModal } from "@/app/_hooks/UseModal";

export function Modal(props: {
    open: boolean;
    title: string;
    description?: string;
    onClose: () => void;
    children: React.ReactNode;
    footer?: React.ReactNode;
}) {
    const { open, title, description, onClose, children, footer } = props;

    /*
     * The hook replaces a hand-rolled Escape listener that fired on EVERY open
     * dialog at once — a confirm opened over this form took the form down with
     * it. It also does what was missing: announce the dialog, move focus into
     * it, lock the page behind it, and give focus back on close.
     */
    if (!open) return null;

    return <ModalPanel {...props} onClose={onClose} title={title} description={description} footer={footer} />;
}

function ModalPanel(props: {
    title: string;
    description?: string;
    onClose: () => void;
    children: React.ReactNode;
    footer?: React.ReactNode;
}) {
    const { title, description, onClose, children, footer } = props;
    const baslikId = React.useId();
    const modal = useModal(onClose, { labelledBy: baslikId });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div
                {...modal}
                className="w-full max-w-lg rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-2xl md:p-6"
            >
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h3 id={baslikId} className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
                        {description ? (
                            <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">{description}</p>
                        ) : null}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 hover:dark:text-slate-200"
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
