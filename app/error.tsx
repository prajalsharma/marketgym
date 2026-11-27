"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui";

export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-24">
      <div className="animate-rise-in w-full max-w-md">
        {/* The logo's chart line with a break in it. Logo colours are fixed by the brand. */}
        <div
          aria-hidden="true"
          className="mb-4 overflow-hidden rounded-lg border border-line-strong bg-[#0b1120] shadow-[inset_0_1px_0_rgb(255_255_255/0.04),var(--shadow-md)]"
        >
          <svg viewBox="0 0 400 110" className="block w-full" fill="none">
            <g stroke="#8da2ff" strokeOpacity="0.1">
              <path d="M0 28h400M0 55h400M0 82h400" />
            </g>
            <path d="M0 80 L60 66 L110 74 L168 42" stroke="#8da2ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M168 42 L236 58" stroke="#8da2ff" strokeOpacity="0.45" strokeWidth="2" strokeDasharray="3 8" strokeLinecap="round" />
            <path d="M236 58 L290 36 L340 46 L400 24" stroke="#8da2ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="168" cy="42" r="5" fill="#0b1120" stroke="#8da2ff" strokeWidth="3" />
            <circle cx="236" cy="58" r="5" fill="#0b1120" stroke="#8da2ff" strokeWidth="3" />
          </svg>
        </div>
        <ErrorState
          title="Something went wrong"
          description="The page hit an unexpected error. Trying again usually fixes it."
          retry={() => retry()}
        />
      </div>
    </main>
  );
}
