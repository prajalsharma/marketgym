import Link from "next/link";
import { Button } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-24">
      <div className="animate-rise-in w-full max-w-md">
        {/* The logo's chart line, running off the edge of what exists. Logo colours are fixed by the brand. */}
        <div
          aria-hidden="true"
          className="relative overflow-hidden rounded-lg border border-line-strong bg-[#0b1120] shadow-[inset_0_1px_0_rgb(255_255_255/0.04),var(--shadow-md)]"
        >
          <svg viewBox="0 0 400 150" className="block w-full" fill="none">
            <g stroke="#8da2ff" strokeOpacity="0.1">
              <path d="M0 38h400M0 75h400M0 112h400" />
            </g>
            <path
              d="M0 112 L52 96 L96 104 L150 62 L198 76 L246 40"
              stroke="#8da2ff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M246 40 L400 40" stroke="#8da2ff" strokeOpacity="0.45" strokeWidth="2" strokeDasharray="3 8" strokeLinecap="round" />
            <circle cx="246" cy="40" r="5" fill="#0b1120" stroke="#8da2ff" strokeWidth="3" />
          </svg>
          <p className="absolute bottom-3 right-4 font-mono text-5xl font-semibold leading-none tracking-tight text-[#8da2ff]">404</p>
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">This page does not exist</h1>
        <p className="mt-2 text-base text-muted">
          The link may be old, or the scenario it pointed to has moved on.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild className="active:scale-[0.98]">
            <Link href="/app">Go to your overview</Link>
          </Button>
          <Button asChild variant="secondary" className="active:scale-[0.98]">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
