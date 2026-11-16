import { ExternalLink } from "lucide-react";
import type { NewsEvidence } from "@/lib/types/market";
import { Badge, Card, CardContent, CardHeader, CardTitle, DataSourceTag } from "@/components/ui";
import { formatDateTime } from "@/lib/client/format";

const CATEGORY_LABEL: Record<NewsEvidence["category"], string> = {
  market: "Market",
  etf: "ETF",
  macro: "Macro",
  regulation: "Regulation",
  research: "Research",
  protocol: "Protocol",
  other: "Other",
};

export function NewsCard({ items }: { items: NewsEvidence[] }) {
  if (items.length === 0) return null;
  return (
    <Card tone="evidence">
      <CardHeader>
        <CardTitle className="text-base">News</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <li key={item.id} className="py-3 first:pt-0 last:pb-0">
              <details className="group">
                <summary className="cursor-pointer list-none rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium leading-snug">{item.title}</p>
                    <Badge tone="neutral">{CATEGORY_LABEL[item.category]}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {item.source} · {formatDateTime(item.publishedAt)}
                    <span className="ml-2 text-subtle group-open:hidden">Show summary</span>
                    <span className="ml-2 hidden text-subtle group-open:inline">Hide summary</span>
                  </p>
                </summary>
                <div className="mt-2 space-y-2 text-sm leading-relaxed">
                  <p>{item.summary}</p>
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-accent underline-offset-4 hover:underline"
                  >
                    Read at {item.source}
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                  <DataSourceTag provenance={item.provenance} compact />
                </div>
              </details>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
