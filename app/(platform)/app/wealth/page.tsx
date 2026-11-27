import type { Metadata } from "next";
import type { WealthBoardResponse } from "@/lib/types/api";
import { PageHeader } from "@/components/ui";
import { FundBoard } from "@/components/wealth/fund-board";
import { FundDetail } from "@/components/wealth/fund-detail";
import { RewardsSection } from "@/components/wealth/rewards-section";
import { RetryError } from "@/components/shared/retry-error";
import { load } from "@/lib/client/server-api";
import { describeError } from "@/lib/client/api";

export const metadata: Metadata = { title: "Wealth lab" };

export default async function WealthLabPage(props: PageProps<"/app/wealth">) {
  const sp = await props.searchParams;
  const fundId = typeof sp.fund === "string" && sp.fund.length > 0 ? sp.fund : null;
  const res = await load<WealthBoardResponse>("/api/market/wealth");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Wealth lab"
        description="Tokenised ETFs, fund vaults and the ANT Believers Index from SoDEX Wealth. Compare how each is priced, what it costs and what past returns leave out. Read-only: MarketGym never trades or holds funds."
      />
      {res.ok ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
          {fundId ? (
            <div className="lg:sticky lg:top-6 lg:order-2">
              <FundDetail key={fundId} fundId={fundId} />
            </div>
          ) : (
            <div className="hidden rounded-lg border border-dashed border-line-strong px-5 py-10 text-center lg:order-2 lg:block">
              <p className="text-base font-medium">Pick a fund to open it</p>
              <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
                Price history, fees, NAV against price and SoDEX&apos;s weekly-buying simulation appear here.
              </p>
            </div>
          )}
          <div className="lg:order-1">
            <FundBoard board={res.data} selectedId={fundId} />
          </div>
        </div>
      ) : (
        <RetryError title="Could not load the fund board" description={describeError(res.error)} />
      )}
      <div className="border-t border-line pt-8">
        <RewardsSection />
      </div>
    </div>
  );
}
