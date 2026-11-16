/**
 * Zod schemas for SoDEX public spot market data (docs/research/SODEX.md).
 * Only /markets/* GET payloads. Decimals arrive as JSON strings.
 */
import { z } from "zod";

export const envelope = z.object({
  code: z.number(),
  timestamp: z.number().optional(),
  data: z.unknown().optional(),
  error: z.string().optional(),
});
export type Envelope = z.infer<typeof envelope>;

const decimalString = z.string().regex(/^-?\d+(\.\d+)?$/, "expected decimal string");

export const spotSymbol = z.object({
  id: z.number(),
  name: z.string(),
  displayName: z.string(),
  baseCoin: z.string(),
  quoteCoin: z.string(),
  pricePrecision: z.number(),
  tickSize: decimalString,
  quantityPrecision: z.number(),
  stepSize: decimalString,
  minQuantity: decimalString.optional(),
  minNotional: decimalString.optional(),
  makerFee: decimalString.optional(),
  takerFee: decimalString.optional(),
  status: z.string(),
});
export const spotSymbols = z.array(spotSymbol);
export type SpotSymbol = z.infer<typeof spotSymbol>;

const level = z.tuple([decimalString, decimalString]);

export const orderBook = z.object({
  blockTime: z.number(),
  blockHeight: z.number().optional(),
  updateID: z.number().optional(),
  bids: z.array(level),
  asks: z.array(level),
});
export type OrderBookRaw = z.infer<typeof orderBook>;

export const spotTicker = z.object({
  symbol: z.string(),
  lastPx: decimalString.optional(),
  openPx: decimalString.optional(),
  highPx: decimalString.optional(),
  lowPx: decimalString.optional(),
  volume: decimalString.optional(),
  quoteVolume: decimalString.optional(),
  changePct: z.number().optional(),
  bidPx: decimalString.optional(),
  askPx: decimalString.optional(),
  openTime: z.number().optional(),
  closeTime: z.number().optional(),
});
export const spotTickers = z.array(spotTicker);
export type SpotTicker = z.infer<typeof spotTicker>;
