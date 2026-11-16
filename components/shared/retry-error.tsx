"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ErrorState } from "@/components/ui";

interface Props {
  title?: string;
  description: string;
}

/** ErrorState whose retry re-renders the server page (router.refresh). */
export function RetryError({ title = "Could not load this page", description }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div aria-busy={pending}>
      <ErrorState
        title={title}
        description={description}
        retry={() => start(() => router.refresh())}
      />
    </div>
  );
}
