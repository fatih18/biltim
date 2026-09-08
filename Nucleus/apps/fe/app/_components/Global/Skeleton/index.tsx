"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";

/**
 * Loading placeholders (§8).
 *
 * A skeleton is part of a data-driven component's contract, not decoration: it
 * holds the space the content will take, so the page does not jump when the
 * answer arrives, and it says "this is coming" instead of showing an empty
 * screen that reads as "there is nothing here".
 *
 * The shimmer is GSAP (§7.4) and stops itself when the element leaves the
 * document. It is skipped entirely for a visitor who has asked for reduced
 * motion.
 */

type SkeletonProps = {
  /** Extra classes — sizing lives at the call site, so the shape can mirror the real content. */
  className?: string;
  /** Corner radius preset. */
  shape?: "block" | "text" | "circle";
};

const SHAPE: Record<NonNullable<SkeletonProps["shape"]>, string> = {
  block: "rounded-lg",
  text: "rounded",
  circle: "rounded-full",
};

export function Skeleton({ className = "", shape = "block" }: SkeletonProps) {
  const shimmer = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      if (!shimmer.current) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.fromTo(
        shimmer.current,
        { xPercent: -100 },
        { xPercent: 100, duration: 1.4, ease: "power1.inOut", repeat: -1 },
      );
    },
    { scope: shimmer },
  );

  return (
    <span
      aria-hidden
      className={`relative block overflow-hidden bg-slate-200 dark:bg-slate-800 ${SHAPE[shape]} ${className}`}
    >
      <span
        ref={shimmer}
        className="absolute inset-y-0 -inset-x-full block bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10"
      />
    </span>
  );
}

/** A paragraph's worth of lines, the last one short like real text. */
export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <span className={`block space-y-2 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={`line-${lines}-${i}`}
          shape="text"
          className={`h-3 ${i === lines - 1 ?"w-2/3" : "w-full"}`}
        />
      ))}
    </span>
  );
}

/**
 * Rows for a table that has not answered yet. `columns` should match the real
 * header so the widths do not shift when the data lands.
 */
export function SkeletonTable({
  rows = 5,
  columns = 4,
  className = "",
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={`w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 ${className}`}
      role="status"
      aria-label="Yükleniyor"
    >
      {Array.from({ length: rows }, (_, r) => (
        <div
          key={`row-${r}`}
          className="flex items-center gap-3 border-b border-slate-100 px-3 py-3 last:border-b-0 sm:gap-4 sm:px-4 dark:border-slate-800/60"
        >
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton
              key={`cell-${r}-${c}`}
              shape="text"
              className={`h-3 ${c === 0 ?"w-1/4" : "flex-1"}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Card placeholders for a grid, mirroring the six-breakpoint layout (§2.2). */
export function SkeletonCards({ count = 4, className = "" }: { count?: number; className?: string }) {
  return (
    <div
      className={`grid grid-cols-1 gap-3 xs:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${className}`}
      role="status"
      aria-label="Yükleniyor"
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={`card-${i}`}
          className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        >
          <Skeleton className="mb-3 h-24 w-full" />
          <SkeletonText lines={2} />
        </div>
      ))}
    </div>
  );
}
