import { TooltipProvider } from "@/components/ui";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-header";
import "@/components/shared/motion.css";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </div>
    </TooltipProvider>
  );
}
