import { ThemeToggle } from "@/components/ui";
import { BrandPanel } from "./brand-panel";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh bg-bg lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <BrandPanel />
      <div className="flex min-w-0 flex-col">
        <header className="flex h-14 items-center justify-end px-4 sm:px-6">
          <ThemeToggle />
        </header>
        <main className="flex flex-1 items-start justify-center px-4 pb-12 pt-2 sm:pt-6 lg:items-center lg:pb-[12dvh] lg:pt-0">
          <div className="page-enter w-full max-w-sm rounded-lg border border-line bg-surface p-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.04),var(--shadow-md)] sm:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
