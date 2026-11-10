/**
 * Why the plan the person clicked was not opened (see _utils/planChoice).
 * It stays on screen: a toast would be gone before it was read, and the list
 * under it is not the plan they asked for.
 */
export function PlanNotice({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p
      role="status"
      className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
    >
      {message}
    </p>
  )
}
