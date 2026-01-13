"use client";

import React from "react";

export function Badge({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center rounded-full bg-slate-800/80 px-2 py-0.5 text-[11px] text-slate-200">
            {children}
        </span>
    );
}

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    const { className = "", ...rest } = props;
    return (
        <button
            {...rest}
            className={[
                "inline-flex items-center justify-center rounded-md bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950",
                "hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed",
                className,
            ].join(" ")}
        />
    );
}

export function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    const { className = "", ...rest } = props;
    return (
        <button
            {...rest}
            className={[
                "inline-flex items-center justify-center rounded-md border border-slate-600 px-4 py-2 text-xs font-medium text-slate-200",
                "hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed",
                className,
            ].join(" ")}
        />
    );
}

export function DangerButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    const { className = "", ...rest } = props;
    return (
        <button
            {...rest}
            className={[
                "inline-flex items-center justify-center rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-200",
                "hover:bg-rose-500/15 disabled:opacity-50 disabled:cursor-not-allowed",
                className,
            ].join(" ")}
        />
    );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
    const { className = "", ...rest } = props;
    return (
        <input
            {...rest}
            className={[
                "w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-50",
                "outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2",
                "placeholder:text-slate-500",
                className,
            ].join(" ")}
        />
    );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
    const { className = "", ...rest } = props;
    return (
        <select
            {...rest}
            className={[
                "w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-50",
                "outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2",
                className,
            ].join(" ")}
        />
    );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    const { className = "", ...rest } = props;
    return (
        <textarea
            {...rest}
            className={[
                "w-full min-h-[96px] rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-50",
                "outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2",
                "placeholder:text-slate-500",
                className,
            ].join(" ")}
        />
    );
}
