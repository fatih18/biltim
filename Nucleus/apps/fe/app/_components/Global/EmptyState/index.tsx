import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

/**
 * What a screen shows when it has nothing to show.
 *
 * "Kayıt bulunamadı" in grey text is not an empty state — it reads as a
 * failure, says nothing about why, and offers nothing to do next. A first-time
 * visitor to a fresh install sees it on nearly every screen and has no idea
 * whether the app is broken or simply new.
 */
export interface EmptyStateProps {
  /** One line, in the user's terms. */
  title: string;
  /** Why it is empty, or what would fill it. */
  description?: string;
  /** Defaults to an inbox. */
  icon?: LucideIcon;
  /** The one thing to do next, if there is one. */
  action?: ReactNode;
  /** `compact` fits inside a table cell or a small card. */
  size?: "default" | "compact";
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  size = "default",
  className = "",
}: EmptyStateProps) {
  const compact = size === "compact";

  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center text-center ${ compact ?"gap-2 px-4 py-8" : "gap-3 px-4 py-12 xs:py-14 sm:py-16"
      } ${className}`}
    >
      <span
        aria-hidden
        className={`flex items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-400 ${ compact ?"h-10 w-10" : "h-14 w-14 sm:h-16 sm:w-16"
        }`}
      >
        <Icon size={compact ? 20 : 26} strokeWidth={1.5} />
      </span>

      <p
        className={`font-semibold text-slate-900 dark:text-slate-100 ${ compact ?"text-sm" : "text-base sm:text-lg"
        }`}
      >
        {title}
      </p>

      {description ? (
        <p className="max-w-md text-xs text-slate-600 sm:text-sm dark:text-slate-400">
          {description}
        </p>
      ) : null}

      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
