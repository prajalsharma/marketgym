import { TooltipProvider } from "@/components/ui";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-header";
import { MotionProvider } from "@/components/shared/motion-provider";
import "@/components/shared/motion.css";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <MotionProvider>
      <TooltipProvider delayDuration={200}>
        <div className="flex min-h-dvh flex-col">
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </div>
      </TooltipProvider>
    </MotionProvider>
  );
}
