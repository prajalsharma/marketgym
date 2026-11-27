import { Skeleton } from "@/components/ui";

export default function WealthLoading() {
  return (
    <div className="space-y-8" role="status" aria-busy="true" aria-label="Loading the wealth lab">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-[36rem] max-w-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
        <Skeleton className="hidden h-96 lg:block" />
      </div>
    </div>
  );
}
