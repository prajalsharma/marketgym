import { Skeleton } from "@/components/ui";

export default function RootLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-3 h-4 w-80" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </main>
  );
}
