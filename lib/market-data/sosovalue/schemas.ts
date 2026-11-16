/**
 * Zod schemas for the SoSoValue OpenAPI v1 payloads we consume
 * (docs/research/SOSOVALUE.md). Numbers may arrive as BigDecimal JSON
 * numbers, numeric strings, or be omitted; `decimal` absorbs all three.
 */
import { z } from "zod";

/** number | numeric string | null | undefined → number | null */
export const decimal = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((v): number | null => {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    const t = v.trim();
    if (t === "") return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  });

/** ms epoch as number or numeric string → ISO string | null */
export const msTimestamp = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((v): string | null => {
    if (v === null || v === undefined) return null;
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n) || n <= 0) return null;
    return new Date(n).toISOString();
  });

export const envelope = z.object({
  code: z.number(),
  message: z.string().optional(),
  data: z.unknown().optional(),
  details: z.unknown().optional(),
});
export type Envelope = z.infer<typeof envelope>;

export const currencyListItem = z.object({
  currency_id: z.string(),
  symbol: z.string(),
  name: z.string().optional().default(""),
});
export const currencyList = z.array(currencyListItem);
export type CurrencyListItem = z.infer<typeof currencyListItem>;

export const currencySnapshot = z.object({
  price: decimal,
  change_pct_24h: decimal,
  turnover_24h: decimal,
  high_24h: decimal.optional(),
  low_24h: decimal.optional(),
  marketcap: decimal,
  fdv: decimal.optional(),
  marketcap_rank: z.number().nullable().optional(),
});
export type CurrencySnapshot = z.infer<typeof currencySnapshot>;

export const marketOverview = z.object({
  total_market_cap: decimal.optional(),
  total_market_cap_change_pct: decimal.optional(),
  total_volume_24h: decimal.optional(),
  eth_gas_gwei: decimal.optional(),
  btc_gas_sat_vb: decimal.optional(),
  as_of: msTimestamp,
});
export type MarketOverview = z.infer<typeof marketOverview>;

export const etfSummaryRow = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  total_net_inflow: decimal,
  total_value_traded: decimal,
  total_net_assets: decimal,
  cum_net_inflow: decimal,
});
export const etfSummaryHistory = z.array(etfSummaryRow);
export type EtfSummaryRow = z.infer<typeof etfSummaryRow>;

export const indexList = z.array(z.string());

export const indexConstituent = z.object({
  currency_id: z.string().optional(),
  symbol: z.string(),
  weight: decimal,
});
export const indexConstituents = z.array(indexConstituent);
export type IndexConstituentRaw = z.infer<typeof indexConstituent>;

export const indexSnapshot = z.object({
  price: decimal.optional(),
  change_pct_24h: decimal.optional(),
  roi_7d: decimal.optional(),
  roi_1m: decimal.optional(),
  roi_3m: decimal.optional(),
  roi_1y: decimal.optional(),
  ytd: decimal.optional(),
});
export type IndexSnapshotRaw = z.infer<typeof indexSnapshot>;

export const newsItem = z.object({
  id: z.union([z.string(), z.number()]).transform((v) => String(v)),
  source_link: z.string().nullable().optional(),
  original_link: z.string().nullable().optional(),
  release_time: msTimestamp,
  title: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  author: z.string().nullable().optional(),
  nick_name: z.string().nullable().optional(),
  category: z.number().nullable().optional(),
  matched_currencies: z
    .array(z.object({ id: z.string().optional(), name: z.string().optional(), full_name: z.string().optional() }))
    .nullable()
    .optional(),
  tags: z.array(z.string()).nullable().optional(),
});
export type NewsItem = z.infer<typeof newsItem>;

export const newsPage = z.object({
  page: z.number().optional(),
  page_size: z.number().optional(),
  total: z.number().optional(),
  list: z.array(newsItem).nullable().optional().transform((v) => v ?? []),
});

export const macroEvents = z.array(z.object({ date: z.string(), events: z.array(z.string()) }));
export type MacroEventDay = z.infer<typeof macroEvents>[number];
