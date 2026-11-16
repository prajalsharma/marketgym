"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui";

export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-24">
      <div className="w-full max-w-md">
        <ErrorState
          title="Something went wrong"
          description="The page hit an unexpected error. Trying again usually fixes it."
          retry={() => retry()}
        />
      </div>
    </main>
  );
}
