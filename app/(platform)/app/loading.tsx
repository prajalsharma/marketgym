import { Skeleton } from "@/components/ui";

const panel =
  "rounded-lg border border-line bg-surface p-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]";

/** Mirrors a typical page: heading, key figures, one main panel, two supporting panels. */
export default function PlatformLoading() {
  return (
    <div className="space-y-8" role="status" aria-busy="true" aria-label="Loading">
      <div className="space-y-3">
        <Skeleton className="h-9 w-72 max-w-full rounded-md" />
        <Skeleton className="h-4 w-[28rem] max-w-full" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className={panel}>
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="mt-4 h-8 w-28 rounded-md" />
            <Skeleton className="mt-3 h-3 w-36 max-w-full" />
          </div>
        ))}
      </div>

      <div className={panel}>
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-5 w-48 max-w-full" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
        <Skeleton className="mt-5 h-44 rounded-md" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className={panel}>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-5" lines={4} />
          </div>
        ))}
      </div>
    </div>
  );
}
