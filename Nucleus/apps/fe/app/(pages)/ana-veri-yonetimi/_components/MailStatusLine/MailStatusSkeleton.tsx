import { Skeleton } from "@/app/_components/Global/Skeleton";

/*
 * The mail status line while it loads (rule 4.8.3): the same box, padding and
 * breakpoints as the loaded line, with its headline (two lines on a phone, one
 * from `sm`) drawn as bars, so nothing jumps when the answer arrives.
 */
export function MailStatusSkeleton() {
  return (
    <div
      role="status"
      aria-label="E-posta durumu yükleniyor"
      className="rounded-lg border border-slate-300 bg-white px-3 py-2 xs:py-2.5 sm:px-4 lg:px-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <Skeleton shape="text" className="h-3.5 w-full xs:h-4 sm:w-11/12" />
      <Skeleton shape="text" className="mt-1.5 h-3.5 w-2/3 xs:h-4 sm:hidden" />
    </div>
  );
}
