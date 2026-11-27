/**
 * Deterministic demo data built from lib/market-data/__fixtures__.
 * provenance.kind is always "demo", provider "fixture", fetchedAt = the
 * fixture's capture time (SoDEX) or the research/doc date (SoSoValue doc
 * examples). Used when a provider is unconfigured, DEMO_MODE=true, or the
 * provider failed with no cached copy. Never labelled live.
 */
import type { DataProvenance, EtfFlowSeries, IndexSnapshot, MarketSnapshot, NewsCategory, NewsEvidence, OrderBookSnapshot } from "@/lib/types";
import sodexBookBtc from "./__fixtures__/sodex/mainnet-spot-orderbook-vBTC_vUSDC.json";
import sodexBookEth from "./__fixtures__/sodex/mainnet-spot-orderbook-vETH_vUSDC.json";
import sodexBookAnt from "./__fixtures__/sodex/mainnet-spot-orderbook-vANT_vUSDC.json";
import sodexSymbolAnt from "./__fixtures__/sodex/mainnet-spot-symbol-vANT_vUSDC.json";
import sodexSymbols from "./__fixtures__/sodex/mainnet-spot-symbols.json";
import sodexPerpsBookAnt from "./__fixtures__/sodex/mainnet-perps-orderbook-ANT-USD.json";
import sodexPerpsSymbols from "./__fixtures__/sodex/mainnet-perps-symbols.json";
import sodexTickerBtc from "./__fixtures__/sodex/mainnet-spot-ticker-vBTC_vUSDC.json";
import sosoEtfSummary from "./__fixtures__/sosovalue/etfs.summary-history.json";
import sosoIndexConstituents from "./__fixtures__/sosovalue/indices.constituents.json";
import sosoIndexList from "./__fixtures__/sosovalue/indices.list.json";
import sosoIndexSnapshot from "./__fixtures__/sosovalue/indices.market-snapshot.json";
import sosoMacro from "./__fixtures__/sosovalue/macro.events.json";
import sosoNewsFeed from "./__fixtures__/sosovalue/news.feed.json";
import sosoNewsPick from "./__fixtures__/sosovalue/news.pick.json";
import { orderBook as orderBookSchema, spotSymbols as spotSymbolsSchema, spotTickers as spotTickersSchema } from "./sodex/schemas";
import { toOrderBookSnapshot, toPerpsSymbolMeta, toSymbolMeta, type SymbolMeta } from "./sodex/normalise";
import { macroDayToNews, toEtfFlowSeries, toIndexSnapshot, toNewsEvidence } from "./sosovalue/normalise";
import { etfSummaryHistory, indexConstituents, indexList, indexSnapshot, macroEvents, newsPage } from "./sosovalue/schemas";

/** Doc-example fixtures carry no capture time; the research was done on this date. */
export const SOSOVALUE_DOC_TIME = "2026-11-06T00:00:00.000Z";

function demoProvenance(sourceUrl: string, fetchedAt: string, note: string, asOf?: string): DataProvenance {
  return { kind: "demo", provider: "fixture", sourceUrl, fetchedAt, ...(asOf ? { asOf } : {}), note };
}

const DEMO_NOTE = "Demo fixture, not real-time market data.";

// ---------- SoDEX-derived ----------

const symbolsParsed = spotSymbolsSchema.parse(sodexSymbols.data);
// the 2026-11-06 symbols capture predates vANT; its own 2026-11-27 capture fills the gap
const antSymbol = spotSymbolsSchema.parse(sodexSymbolAnt.data);
const spotMetas: SymbolMeta[] = [...symbolsParsed, ...antSymbol.filter((a) => !symbolsParsed.some((s) => s.name === a.name))].map(toSymbolMeta);
const perpsMetas: SymbolMeta[] = spotSymbolsSchema.parse(sodexPerpsSymbols.data).map(toPerpsSymbolMeta);
const symbolMetas: SymbolMeta[] = [...spotMetas, ...perpsMetas];

export function demoSymbols(): SymbolMeta[] {
  return spotMetas.map((m) => ({ ...m }));
}

export function demoPerpsSymbols(): SymbolMeta[] {
  return perpsMetas.map((m) => ({ ...m }));
}

const bookFixtures: Record<string, { captured: string; source: string; data: unknown }> = {
  vBTC_vUSDC: { captured: sodexBookBtc._captured_at, source: sodexBookBtc._source, data: sodexBookBtc.data },
  vETH_vUSDC: { captured: sodexBookEth._captured_at, source: sodexBookEth._source, data: sodexBookEth.data },
  vANT_vUSDC: { captured: sodexBookAnt._captured_at, source: sodexBookAnt._source, data: sodexBookAnt.data },
  "perps:ANT-USD": { captured: sodexPerpsBookAnt._captured_at, source: sodexPerpsBookAnt._source, data: sodexPerpsBookAnt.data },
};

export function demoOrderBookMarkets(): string[] {
  return Object.keys(bookFixtures);
}

export function demoOrderBook(market: string, limit = 20, note = DEMO_NOTE): OrderBookSnapshot | null {
  const fx = bookFixtures[market];
  const meta = symbolMetas.find((m) => m.name === market);
  if (!fx || !meta) return null;
  const raw = orderBookSchema.parse(fx.data);
  const trimmed = { ...raw, bids: raw.bids.slice(0, limit), asks: raw.asks.slice(0, limit) };
  const asOf = new Date(raw.blockTime).toISOString();
  return toOrderBookSnapshot(meta, trimmed, demoProvenance(fx.source, fx.captured, note, asOf));
}

const btcTicker = spotTickersSchema.parse(sodexTickerBtc.data)[0];
const ethBook = orderBookSchema.parse(sodexBookEth.data);

/**
 * Demo snapshots are derived from SoDEX captures (real observed prices on
 * 2026-11-06). Market cap is unavailable in the fixtures and stays null;
 * BTC volume is SoDEX venue quote volume, not global volume.
 */
export function demoSnapshot(asset: string, note = DEMO_NOTE): MarketSnapshot | null {
  const a = asset.toUpperCase();
  if (a === "BTC" && btcTicker) {
    const asOf = btcTicker.closeTime ? new Date(btcTicker.closeTime).toISOString() : undefined;
    const prov = demoProvenance(sodexTickerBtc._source, sodexTickerBtc._captured_at, `${note} Price/change from a SoDEX ticker capture; volume is venue volume; market cap unavailable.`, asOf);
    return {
      asset: "BTC",
      name: "Bitcoin",
      price: Number(btcTicker.lastPx ?? 0),
      percentageChange24h: btcTicker.changePct !== undefined ? Math.round(btcTicker.changePct * 100) / 100 : null,
      volume24h: btcTicker.quoteVolume !== undefined ? Number(btcTicker.quoteVolume) : null,
      marketCapitalisation: null,
      timestamp: asOf ?? prov.fetchedAt,
      provenance: prov,
    };
  }
  if (a === "ETH") {
    const bestBid = Number(ethBook.bids[0]?.[0] ?? 0);
    const bestAsk = Number(ethBook.asks[0]?.[0] ?? 0);
    const asOf = new Date(ethBook.blockTime).toISOString();
    const prov = demoProvenance(sodexBookEth._source, sodexBookEth._captured_at, `${note} Price is the SoDEX order-book mid at capture; change, volume and market cap unavailable.`, asOf);
    return {
      asset: "ETH",
      name: "Ethereum",
      price: Math.round(((bestBid + bestAsk) / 2) * 100) / 100,
      percentageChange24h: null,
      volume24h: null,
      marketCapitalisation: null,
      timestamp: asOf,
      provenance: prov,
    };
  }
  return null;
}

// ---------- SoSoValue doc-example fixtures ----------

export function demoNews(limit = 12, category?: NewsCategory, note = DEMO_NOTE): NewsEvidence[] {
  const pick = newsPage.parse(sosoNewsPick.data).list.map((i) => toNewsEvidence(i, demoProvenance(sosoNewsPick._source, SOSOVALUE_DOC_TIME, note)));
  const feed = newsPage.parse(sosoNewsFeed.data).list.map((i) => toNewsEvidence(i, demoProvenance(sosoNewsFeed._source, SOSOVALUE_DOC_TIME, note)));
  const macro = macroEvents.parse(sosoMacro.data).map((d) => macroDayToNews(d, demoProvenance(sosoMacro._source, SOSOVALUE_DOC_TIME, note)));
  const all = [...pick, ...feed, ...macro];
  const matching = category ? all.filter((n) => n.category === category) : all;
  const rest = category ? all.filter((n) => n.category !== category) : [];
  return [...matching, ...rest].slice(0, limit);
}

export function demoEtfFlows(asset: "BTC" | "ETH", note = DEMO_NOTE): EtfFlowSeries {
  const rows = etfSummaryHistory.parse(sosoEtfSummary.data);
  const extra = asset === "ETH" ? " The documented example is the BTC series; reused for ETH in demo mode." : "";
  return toEtfFlowSeries(asset, rows, demoProvenance(sosoEtfSummary._source, SOSOVALUE_DOC_TIME, `${note}${extra}`));
}

export function demoIndexes(note = DEMO_NOTE): IndexSnapshot[] {
  const tickers = indexList.parse(sosoIndexList.data);
  const cons = indexConstituents.parse(sosoIndexConstituents.data);
  const snap = indexSnapshot.parse(sosoIndexSnapshot.data);
  return tickers.map((t) => toIndexSnapshot(t, cons, snap, demoProvenance(sosoIndexSnapshot._source, SOSOVALUE_DOC_TIME, note)));
}
