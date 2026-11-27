import { Skeleton } from "@/components/ui";

export default function PortfolioLoading() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading your practice portfolio">
      <div className="space-y-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-[32rem] max-w-full" />
      </div>
      <Skeleton className="h-11" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
        <Skeleton className="h-[36rem]" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </div>
    </div>
  );
}
